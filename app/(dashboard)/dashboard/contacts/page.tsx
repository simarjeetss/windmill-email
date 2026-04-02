import Link from "next/link";
import { getAllContacts } from "@/lib/supabase/campaigns";
import ContactsTable from "@/components/contacts/contacts-table";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default async function ContactsPage() {
  const { data: contacts, error } = await getAllContacts();

  return (
    <div className="max-w-5xl mx-auto">
      <div className="rk-fade-up flex items-start justify-between mb-8 flex-wrap gap-3">
        <div>
          <h1
            className="text-3xl font-medium mb-1"
            style={{ fontFamily: "var(--font-display)", color: "var(--rk-text)" }}
          >
            Contacts
          </h1>
          <p className="text-sm" style={{ color: "var(--rk-text-muted)" }}>
            {contacts.length === 0
              ? "Add contacts to start sending campaigns"
              : `${contacts.length} contact${contacts.length !== 1 ? "s" : ""}`}
          </p>
        </div>
        <Link href="/dashboard/campaigns">
          <Button size="sm">Manage campaigns</Button>
        </Link>
      </div>

      {error && (
        <div
          className="rk-fade-in mb-6 px-4 py-3 rounded-lg text-sm"
          style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", color: "#f87171" }}
        >
          {error}
        </div>
      )}

      {contacts.length === 0 ? (
        <Card className="rk-fade-up rk-delay-1" size="sm">
          <CardHeader>
            <CardTitle>Bring your contacts in</CardTitle>
            <CardDescription>
              Contacts live inside campaigns. Create a campaign to add or import contacts.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex items-center gap-2">
            <Link href="/dashboard/campaigns/new">
              <Button size="sm">Create campaign</Button>
            </Link>
            <Link href="/dashboard/campaigns">
              <Button variant="outline" size="sm">View campaigns</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="rk-fade-up rk-delay-1">
          <ContactsTable contacts={contacts} />
        </div>
      )}
    </div>
  );
}
