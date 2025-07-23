import Image from "next/image";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { UserProps } from "@/lib/types";

const Stories = ({ user }: { user: UserProps }) => {
  return (
    <div className="flex flex-row overflow-x-auto p-2  rounded-lg shadow-md [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
      {Array.from({ length: 10 }).map((_, index) => {
        return (
          <Avatar key={index} className="w-16 h-16 m-2">
            <Image
              src={`https://i.pravatar.cc/500?u=${user?.username}`}
              alt={`${user?.username}'s avatar`}
              width={500}
              height={500}
            />
            <AvatarFallback>
              {user?.username?.charAt(0).toUpperCase() || "U"}
            </AvatarFallback>
          </Avatar>
        );
      })}
    </div>
  );
};

export default Stories;
