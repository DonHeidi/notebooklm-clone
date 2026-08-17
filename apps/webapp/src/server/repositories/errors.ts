// Thrown when a row does not exist for the given owner. Deliberately does not
// distinguish "does not exist" from "exists but belongs to someone else", so
// callers cannot leak existence of other users' data.
export class NotFoundError extends Error {}
