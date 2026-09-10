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
  if (req.method !== "POST") return Response.json({error:"Method not allowed"},{status:405});
  try {
    const b = await req.json();
    const firstName = String(b.firstName||"").trim();
    const lastName = String(b.lastName||"").trim();
    const phone = normPhone(String(b.phone||""));
    const email = normEmail(String(b.email||""));
    if (!firstName || !lastName || phone.length < 7) return Response.json({error:"Please enter first name, last name, and a valid phone number."},{status:400});
    const s = store();
    const phoneKey = "phone/" + phone;
    const existingId = await s.get(phoneKey);
    if (existingId) {
      const existing = await s.get("member/" + existingId, {type:"json"});
      return Response.json({error:"A membership already exists for this phone number.", member: existing ? safeMember(existing) : null},{status:409});
    }
    if (email) {
      const emailId = await s.get("email/" + email);
      if (emailId) return Response.json({error:"A membership already exists for this email address."},{status:409});
    }
    const list = await s.list({prefix:"member/"});
    const next = list.blobs.length + 1;
    const memberId = "BR" + String(next).padStart(4,"0");
    const member = { memberId, firstName, lastName, phone, email, joinedAt:new Date().toISOString(), points:0, nights:0, stays:0 };
    await s.setJSON("member/"+memberId, member);
    await s.set(phoneKey, memberId);
    if (email) await s.set("email/"+email, memberId);
    return Response.json({member:safeMember(member)});
  } catch (e) {
    return Response.json({error:"Could not create membership."},{status:500});
  }
};
export const config: Config = { path: "/api/join" };
