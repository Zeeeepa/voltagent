import samsungLogo from "./logo.png";

export const SamsungLogo = ({ className }: { className?: string }) => (
  <img src={samsungLogo} className={className} alt="Samsung" loading="lazy" />
);
