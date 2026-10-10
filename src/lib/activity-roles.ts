import type { MyIdentity } from "./member-link";

export type MatchedRole = "owner" | "driver" | "collector";

/** Which role(s) `identity` plays on `activity` - checked independently, so
 *  one person (e.g. Mum) can be the owner of their own activity AND a
 *  driver/collector for someone else's, all at once. */
export function matchRoles(
  identity: MyIdentity,
  activity: { childIds: string[]; owner?: string[]; collector?: string[] }
): MatchedRole[] {
  const roles: MatchedRole[] = [];
  if (identity.childId && activity.childIds.includes(identity.childId)) roles.push("owner");
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
