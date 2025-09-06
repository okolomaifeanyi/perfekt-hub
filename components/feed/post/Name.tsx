import { Muted } from "@/components/Typography";

const Name = ({
  fullName,
  username,
}: {
  fullName?: string;
  username: string;
}) => {
  return (
    <div className="flex flex-col space-y-1 !text-xs min-w-0 overflow-hidden max-w-[180px] sm:max-w-[220px] md:max-w-[250px]">
      <strong className="!mt-0 truncate">{fullName || username}</strong>

      <Muted className="text-xs truncate">@{username}</Muted>
    </div>
  );
};

export default Name;
