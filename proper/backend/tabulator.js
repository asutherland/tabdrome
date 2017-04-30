const murmurHash3 = require('./utils/mhash3');

/**
 * Make a sorting comparator that uses two keys, the first of which is indexed
 * into the provided ordering list, and the second (for use within the same
 * group) which does a straight-up cmp() equivalent.
 */
function makeClusteredComparator(groupKey, groupOrder, sortField) {
  return function sortingComparator(a, b) {
    let aGroupPri = groupOrder.indexOf(a.props[groupKey]);
    let bGroupPri = groupOrder.indexOf(b.props[groupKey]);
    let groupPriDelta = aGroupPri - bGroupPri;
    if (groupPriDelta) {
      return groupPriDelta;
    }
    let aKey = a.props[sortField];
    let bKey = b.props[sortField];
    if (aKey < bKey) {
      return -1;
    } else if (aKey > bKey) {
      return 1;
    } else {
      return 0;
    }
  };
}

const ROOT_SORT_GROUP_ORDER = ['pinned', 'domains', 'normal'];
const rootComparator = makeClusteredComparator(
  'rootSortGroup', ROOT_SORT_GROUP_ORDER, 'rootSortKey');

function makeFieldComparator(sortField) {
  return function(a, b) {
    let aKey = a.props[sortField];
    let bKey = b.props[sortField];
    if (aKey < bKey) {
      return -1;
    } else if (aKey > bKey) {
      return 1;
    } else {
      return 0;
    }
  };
}

/**
 * Sort children, parametrized by a props dictionary that presumably belongs to
 * the parent and may specify a specific sorting rule to use.
 *
 * The rationale behind this method and its structuring is:
 * - Not everything has to use the same sort order.  Heterogeneous, yo.
 * - We want the groups to be inert data so they can go over the wire cleanly.
 *   Hence string values in props rather than direct comparator functions.
 */
function sortChildren(props, children) {
  let sortBy = props.sortChildrenBy;
  let sortingComparator;
  switch (sortBy) {
    // using $ as a magic prefix for now.
    case '$root':
      sortingComparator = rootComparator;
      break;

    // Otherwise let's assume they want to sort on the props value of this key.
    default:
      sortingComparator = makeFieldComparator(sortBy);
      break;
  }

  let sorted = children;
  sorted.sort(sortingComparator);
  return sorted;
}

/**
 * Everything is a group.  Everything is always a group.  The group has
 * properties.  These properties can define something that defines the group.
 * For example, the group might have type 'tab', and a `tab` property that is
 * `NormalizedTab`.  Then all the children will get visually indented and maybe
 * those children are groups that are also tabs, etc. etc.  We've invented
 * nested tabs!  Hooray!
 *
 * However, those groups could also be things like breadcrumb pieces.  Or a
 * picture of a cat.  Who knows!  We're just a data structure with poorly
 * defined terminology.
 *
 * @param {RootNode} rootNode
 *   The root node of this tree; I'm not clear why I provided this linkage.
 *   Presumably I did it because the root node is the only one that is its own
 *   special class and it's a place to stash context/environment information.
 *   (Or maybe I did it for debugging?)
 * @param {String} groupRelId
 *   An identifier for this object derived from its definingProps that should be
 *   stable through multiple independent tabulation cycles.  Currently a
 *   stringified representation of the definingProps, but it could be a hash in
 *   the future.
 * @param {Object} definingProps
 *   See `getOrCreateGroup`
 * @param {Object} extraProps
 *   See `getOrCreateGroup`
 * @param {Object} [weakProps]
 *   See `getOrCreateGroup`
 */
class GroupNode {
  constructor(rootNode, groupRelId, definingProps, extraProps, weakProps) {
    // Treat null rootNode as if `this` was passed because RootNode can't use
    // `this` in its call to super.
    this.rootNode = rootNode || this;
    this.groupRelId = groupRelId;
    this.children = [];
    this.props = Object.assign({}, definingProps, extraProps);
    if (weakProps) {
      for (let key of weakProps) {
        if (!(key in this.props)) {
          this.props[key] = weakProps[key];
        }
      }
    }
  }

  /**
   * Find an existing GroupNode child that possesses that same defining property
   * values.  If it does not exist, create it with the given properties.
   *
   * @param {Object} definingProps
   *   Object dictionary whose keys/values are tested for equivalence against
   *   existing children.  If a match is found, we return that child without
   *   modifying it.  TBD: Should weakProps apply?
   * @param {Object} extraProps
   *   Object dictionary whose keys/values should be set but not used for
   *   equivalence testing.
   * @param {Object} [weakProps]
   *   Uh, properties to apply if they don't clobber existing props.  It's not
   *   clear what my intent here was.  This could have been meant as props to
   *   apply if a child already exists.  Or it could have been a weird way to
   *   structure defaults (the alternate is just put them in Object.assign
   *   before the things that should override them).
   */
  getOrCreateGroup(definingProps, extraProps, weakProps) {
    // - Try and find the existing kid.
    for (let kid of this.children) {
      let matched = true;
      for (let key in definingProps) {
        if (kid.props[key] !== definingProps[key]) {
          matched = false;
          break;
        }
      }
      if (matched) {
        return kid;
      }
    }

    let groupRelId = '';
    for (let key in definingProps) {
      groupRelId += '!' + key + '=' + definingProps[key];
    }

    // - Nope, gotta create a new kid.
    let kid = new GroupNode(this.rootNode, groupRelId, definingProps,
                            extraProps, weakProps);
    this.children.push(kid);
    return kid;
  }

  /**
   * Recursively render ourselves and our children into an inert data structure.
   * Props are cloned shallowly, children are sorted and __serialize recursively
   * invoked on them.
   */
  __serialize() {
    const sortedKids = sortChildren(this.props, this.children);

    let maxSerial = 0;
    let aggrString = '';
    const serializedKids = sortedKids.map(x => {
      const serialized = x.__serialize();
      maxSerial = Math.max(maxSerial, serialized.serial || 0);
      aggrString += '|' + serialized.groupRelId;
      return serialized;
    });

    return {
      groupRelId: this.groupRelId,
      // If an explicit serial was provided, use that.  In the cast of the
      // rootNode, this will be the globalSerial.
      serial: this.props.serial || maxSerial,
      // We compute a hash over our contents as well to deal with the removal
      // of children.  This is necessary for aggregates where the only change
      // in their subtree is the removal of a node.  In that case, their derived
      // max serial will not change, so the content hash is necessary.
      // Alternately, some type of tombstone mechanism and/or persistent state
      // tracking for the aggregates would be required.  (However, for sanity,
      // we've opted for the tabulator's logic to be stateless.)
      hash: murmurHash3(aggrString, 43),
      // Rename from props to nodeProps to avoid confusion as this possibly
      // crosses into React-space where "props" has pretty clear semantics.  UI
      // may still spread these into acutal props, but better for that to be an
      // explicit, clear transition.
      nodeProps: Object.assign({}, this.props),
      children: serializedKids
    };
  }
}

/**
 * A regular node but with a default set of props that specifies we should use
 * our special root comparator.
 */
class RootNode extends GroupNode {
  constructor(globalSerial) {
    super(null, '!root', {}, { sortChildrenBy: '$root', serial: globalSerial });
  }
}

function translateBidTagsToNumbers(tag) {
  switch (tag) {
    case 'extension-implies-intent':
      return 2;
    case 'meh':
      return 1;
    default:
      throw new Error('not a valid bid: ' + tag);
  }
}

class Tabulator {
  constructor({ arrangers }) {
    this.arrangers = arrangers;
  }

  /**
   * Given a list of normalized tabs, let all of the arrangers bid on the tabs,
   * then arrange the tabs they won into the recursive GroupNode hierarchy, with
   * us returning the root node.
   */
  tabulate(normTabs, globalSerial) {
    // - Bid!
    // Keys are Arrangers, values are lists of tabs.
    let assignments = new Map();
    for (let arranger of this.arrangers) {
      assignments.set(arranger, []);
    }

    for (let normTab of normTabs.values()) {
      let highBid = null;
      let useArranger = null;
      for (let arranger of this.arrangers) {
        let bid = arranger.bidForTab(normTab);
        if (!bid) {
          continue;
        }
        let bidValue = translateBidTagsToNumbers(bid);
        if (!highBid || bidValue > highBid) { // precedence to earlier arrangers
          highBid = bid;
          useArranger = arranger;
        }
      }
      if (!useArranger) {
        throw new Error('no one bid on tab:' + normTab.suid);
      }

      assignments.get(useArranger).push(normTab);
    }

    // - Arrange!
    let root = new RootNode(globalSerial);
    for (let [arranger, assignedTabs] of assignments) {
      if (assignedTabs.length) {
        arranger.arrangeTabs(assignedTabs, root);
      }
    }

    return root;
  }
}

module.exports = Tabulator;
