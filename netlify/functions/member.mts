import { getStore, getDeployStore } from "@netlify/blobs";
import type { Config } from "@netlify/functions";

function store() {
  return Netlify.context?.deploy.context === "production"
    ? getStore("burgundy-rewards-members", { consistency: "strong" })
    : getDeployStore("burgundy-rewards-members");
}
function normPhone(v: string) { return (v || "").replace(/\D/g, ""); }
function normEmail(v: string) { return (v || "").trim().toLowerCase(); }
function safeMember(m: any) {
  return { memberId:m.memberId, firstName:m.firstName, lastName:m.lastName, joinedAt:m.joinedAt, points:m.points||0, nights:m.nights||0, stays:m.stays||0 };
}
export default async (req: Request) => {
  const url = new URL(req.url);
  const contact = String(url.searchParams.get("contact")||"").trim();
  if (!contact) return Response.json({error:"Enter your phone number or email."},{status:400});
  const s = store();
  const isEmail = contact.includes("@");
  const key = isEmail ? "email/"+normEmail(contact) : "phone/"+normPhone(contact);
  const memberId = await s.get(key);
  if (!memberId) return Response.json({error:"Membership not found. Check the phone/email or join free."},{status:404});
  const member = await s.get("member/"+memberId,{type:"json"});
  if (!member) return Response.json({error:"Membership record not found."},{status:404});
  return Response.json({member:safeMember(member)});
};
export const config: Config = { path: "/api/member" };
