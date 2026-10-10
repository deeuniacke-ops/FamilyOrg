import type { MyIdentity } from "./member-link";

export type MatchedRole = "owner" | "driver" | "collector";

/** Which role(s) `identity` plays on `activity` - a child can only ever be
 *  the "owner" (it's their activity), a helper can be driver and/or
 *  collector (or neither) depending on the owner/collector assignments. */
export function matchRoles(
  identity: MyIdentity,
  activity: { childIds: string[]; owner?: string[]; collector?: string[] }
): MatchedRole[] {
  if (identity.type === "child") {
    return activity.childIds.includes(identity.id) ? ["owner"] : [];
  }
  const roles: MatchedRole[] = [];
  if (activity.owner?.includes(identity.name)) roles.push("driver");
  if (activity.collector?.includes(identity.name)) roles.push("collector");
  return roles;
}

/** Role-aware reminder line(s) for one activity, e.g.
 *  "You're dropping off: Emma-Lou to Hockey (17:00)" */
export function describeActivityForMe(
  roles: MatchedRole[],
  activity: { title: string; time: string; allDay?: boolean },
  childNames: string[]
): string[] {
  const timeSuffix = activity.allDay ? "" : ` (${activity.time})`;
  const who = childNames.join(", ") || "them";
  const lines: string[] = [];
  if (roles.includes("owner")) lines.push(`You have: ${activity.title}${timeSuffix}`);
  if (roles.includes("driver")) lines.push(`You're dropping off: ${who} to ${activity.title}${timeSuffix}`);
  if (roles.includes("collector")) lines.push(`You're collecting: ${who} from ${activity.title}${timeSuffix}`);
  return lines;
}
