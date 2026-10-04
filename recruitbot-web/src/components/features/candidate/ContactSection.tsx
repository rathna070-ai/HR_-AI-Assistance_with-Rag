import { Mail, MapPin, Phone } from "lucide-react";
import { Section } from "./Section";

// Only rows with data are rendered.
export function ContactSection({ email, phoneNumber, location }: { email?: string; phoneNumber?: string; location?: string }) {
  const rows = [
    { icon: Mail, value: email, label: "Email" },
    { icon: Phone, value: phoneNumber, label: "Phone" },
    { icon: MapPin, value: location, label: "Location" },
  ].filter((r) => r.value);
  if (!rows.length) return null;

  return (
    <Section label="Contact" testId="contact-section">
      <ul className="flex flex-col gap-1.5 text-sm text-text-primary">
        {rows.map(({ icon: Icon, value, label }) => (
          <li key={label} className="flex items-center gap-2">
            <Icon className="h-4 w-4 text-text-muted" aria-label={label} />
            <span className="break-all">{value}</span>
          </li>
        ))}
      </ul>
    </Section>
  );
}
