
export const GOT_CLIENT = 'GOT_CLIENT';

/**
 * The back-end is telling us about an updated workflow. Changes we make to a
 * workflow currently don't get exposed via redux because we mutate in-place
 * and the back-end won't report our saves back to us.  This currently flow is
 * based on initial development shortcuts and should be revisited even if
 * mutation-in-place is the right answer or even just an acceptable answer.
 */
export const UPDATED_WORKFLOW = 'UPDATED_WORKFLOW';

/** Either we or the back-end are deleting a workflow. */
export const DELETED_WORKFLOW = 'DELETED_WORKFLOW';
