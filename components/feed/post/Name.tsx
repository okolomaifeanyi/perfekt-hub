import { Muted } from "@/components/Typography";

const Name = ({
  fullName,
  username,
}: {
  fullName?: string;
  username: string;
}) => {
  
  return (
    <div className="flex flex-col space-y-1 !text-xs">
      <strong className="!mt-0 truncate">
        {fullName || username}
      </strong>

      <Muted className="text-xs truncate">@{username}</Muted>
    </div>
  );
};

export default Name;
