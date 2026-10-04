import * as DialogPrimitive from "@radix-ui/react-dialog";
import { AnimatePresence, m } from "framer-motion";
import { useCandidateModal } from "@/hooks/use-candidate-modal";
import { CertificationsSection } from "./CertificationsSection";
import { ContactSection } from "./ContactSection";
import { EducationSection } from "./EducationSection";
import { ExperienceSection } from "./ExperienceSection";
import { ModalHeader } from "./ModalHeader";
import { ProjectsSection } from "./ProjectsSection";
import { SkillsSection } from "./SkillsSection";

function LoadingSkeleton() {
  return (
    <div className="flex flex-col gap-4 p-6" data-testid="candidate-skeleton" aria-busy="true">
      {["w-1/2", "w-3/4", "w-full", "w-2/3", "w-full"].map((w, i) => (
        <div key={i} className={`h-4 ${w} animate-pulse rounded bg-white/[0.08]`} />
      ))}
    </div>
  );
}

// One modal for the whole page. Radix Dialog provides the focus trap and
// closes on Escape and on overlay click; Framer Motion animates it.
export function CandidateModal() {
  const { isOpen, candidate, loading, closeModal } = useCandidateModal();

  return (
    <DialogPrimitive.Root open={isOpen} onOpenChange={(open) => !open && closeModal()}>
      <AnimatePresence>
        {isOpen && (
          <DialogPrimitive.Portal forceMount>
            <DialogPrimitive.Overlay asChild forceMount>
              <m.div
                className="fixed inset-0 z-40 bg-black/50 backdrop-blur-md"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                data-testid="candidate-overlay"
              />
            </DialogPrimitive.Overlay>
            <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center p-4">
              <DialogPrimitive.Content asChild forceMount aria-describedby={undefined}>
                <m.div
                  className="pointer-events-auto max-h-[88vh] w-full max-w-[640px] overflow-y-auto rounded-2xl border border-white/[0.07] bg-bg-surface shadow-2xl focus:outline-none"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  data-testid="candidate-modal"
                >
                  {loading || !candidate ? (
                    <>
                      <DialogPrimitive.Title className="sr-only">Loading candidate profile</DialogPrimitive.Title>
                      <LoadingSkeleton />
                    </>
                  ) : (
                    <>
                      <ModalHeader name={candidate.name} title={candidate.title} company={candidate.company} />
                      <div className="flex flex-col gap-6 p-6">
                        <ContactSection email={candidate.email} phoneNumber={candidate.phoneNumber} location={candidate.location} />
                        <SkillsSection skills={candidate.skills} />
                        <ExperienceSection
                          experience={candidate.experience}
                          totalExperience={candidate.totalExperience}
                          summary={candidate.experienceSummary}
                        />
                        <EducationSection education={candidate.education} />
                        <ProjectsSection projects={candidate.projects} />
                        <CertificationsSection certifications={candidate.certifications} />
                      </div>
                    </>
                  )}
                </m.div>
              </DialogPrimitive.Content>
            </div>
          </DialogPrimitive.Portal>
        )}
      </AnimatePresence>
    </DialogPrimitive.Root>
  );
}
