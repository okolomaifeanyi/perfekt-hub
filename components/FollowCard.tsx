import { UserProps } from "@/lib/types";
import { Card, CardContent } from "./ui/card";
import AvatarHoverCard from "./AvatarHoverCard";
import ConnectDropdown from "./Connect";
import { useRouter } from "next/navigation";

const FollowCard = ({
  className,
  user,
}: {
  className?: string;
  user: UserProps;
}) => {
  const router = useRouter();

  const handleCardClick = (url: string) => {
    router.push(url);
  };
  return (
    <Card
      className={`${className} 
        cursor-pointer
        transition hover:bg-background/60 backdrop-blur-lg py-4`}
      onClick={() => user && handleCardClick(`/${user.username}`)}
    >
      <CardContent className="space-y-4 px-0">
        <div className="flex justify-between items-center px-4">
          <AvatarHoverCard user={user} />
          <div onClick={e => e.stopPropagation()}>
            <ConnectDropdown targetUid={user.uid} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default FollowCard;
