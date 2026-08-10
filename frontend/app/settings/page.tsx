import { PageIntro } from "@/components/PageIntro";
import { SettingsPanel } from "@/components/SettingsPanel";

export default function SettingsPage() {
  return (
    <div className="mx-auto max-w-6xl">
      <PageIntro
        title="Settings"
        description="Review active integration settings, local preferences, and evaluation controls."
      />
      <SettingsPanel />
    </div>
  );
}
