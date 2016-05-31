
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
 */
class GroupNode {
  constructor(rootNode, definingProps, extraProps, weakProps) {
    this.rootNode = rootNode;
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
   * values.  If it does not exist, create it.
   */
  getOrCreateGroup(definingProps, extraProps, weakProps) {
    // - Try and find the existing kid.
    for (let kid of this.children) {
      let matched = true;
      for (let key of definingProps) {
        if (kid.props[key] !== definingProps[key]) {
          matched = false;
          break;
        }
      }
      if (matched) {
        return kid;
      }
    }

    // - Nope, gotta create a new kid.  Go figure.
    let kid = new GroupNode(this.rootNode, definingProps, extraProps, weakProps);
    this.children.push(kid);
  }

  /**
   * Render ourselves into an ordered, shallowly snapshotted, inert data
   * structure that can be structured-cloned and/or JSON.stringify'd.
   */
  __serialize() {
    const sortedKids = sortChildren(this.props, this.children);
    return {
      props: Object.assign({}, this.props),
      children: sortedKids.map(x => x.__serialize())
    };
  }
}

/**
 * A regular node but with a default set of props that specifies we should use
 * our special root comparator.
 */
class RootNode extends GroupNode {
  constructor() {
    super(this, null, { sortChildrenBy: '$root' });
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
  tabulate(tabs) {
    // - Bid!
    // Keys are Arrangers, values are lists of tabs.
    let assignments = new Map();
    for (let arranger of this.arrangers) {
      assignments.set(arranger, []);
    }

    for (let tab of tabs) {
      let highBid = null;
      let useArranger = null;
      for (let arranger of this.arrangers) {
        let bid = arranger.bidForTab(tab);
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
        throw new Error('no one bid on tab:' + tab.id);
      }

      assignments.get(useArranger).push(tab);
    }

    // - Arrange!
    let root = new RootNode();
    for (let [arranger, assignedTabs] of assignments) {
      if (assignedTabs.length) {
        arranger.arrangeTabs(assignedTabs, root);
      }
    }

    return root;
  }
}

module.exports = Tabulator;
