import Link from "next/link";
import { buttonStyles } from "@/components/ui/button";
import { PageHeader } from "@/features/shell/page-header";

export default function NotFound() {
  return (
    <>
      <PageHeader
        title="Page not found"
        description="This page doesn't exist. It may have moved, or the link is wrong."
      />
      <Link href="/approvals" className={buttonStyles({ variant: "primary" })}>
        Go to the approval queue
      </Link>
    </>
  );
}
