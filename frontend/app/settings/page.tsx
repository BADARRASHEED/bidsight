import { PageIntro } from "@/components/PageIntro";
import { SettingsPanel } from "@/components/SettingsPanel";

export default function SettingsPage() {
  return (
    <div className="mx-auto max-w-6xl">
      <PageIntro
        title="Settings"
        description="Manage local frontend defaults and review the deterministic MVP scoring configuration."
      />
      <SettingsPanel />
    </div>
  );
}
