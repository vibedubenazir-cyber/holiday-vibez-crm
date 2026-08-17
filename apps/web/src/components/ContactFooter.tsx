// The sign-off block that closes every client-facing document (itinerary
// report and quotation). The company side is fixed; the left side is the
// consultant who owns the document, when the page knows who that is.
export interface ContactPerson {
  name: string;
  phone?: string | null;
  email?: string | null;
}

export function ContactFooter({ consultant }: { consultant?: ContactPerson | null }) {
  return (
    <div className="mt-10 flex flex-wrap items-center justify-between gap-6 border-t border-slate-100 pt-6">
      <div className="flex items-center gap-3">
        <span className="text-base font-bold text-brand">holiday vibez</span>
        {consultant && (
          <div className="border-l border-slate-200 pl-3 text-xs text-slate-600">
            <p className="font-semibold text-slate-700">{consultant.name}</p>
            {consultant.phone && <p>Phone: {consultant.phone}</p>}
            {consultant.email && <p>Email: {consultant.email}</p>}
          </div>
        )}
      </div>
      <div className="text-right text-xs text-slate-600">
        <p className="font-semibold text-slate-700">HOLIDAY VIBEZ PRIVATE LIMITED</p>
        <p>Phone: 9645123446</p>
        <p>Email: holidays@holidayvibez.com</p>
        <p>Address: 2nd floor, ANANDHAM ELITE, 1, MRTS ROAD, 1st Main Rd, Velachery, Chennai, Tamil Nadu 600042</p>
      </div>
    </div>
  );
}
