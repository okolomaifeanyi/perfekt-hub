import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import Image from "next/image";

const MyAvatar = ({ src, alt, fallback }: { src: string; alt: string;  fallback: string}) => {
  return (
    <Avatar className="w-16 h-16">
      <Image
        src={src}
        alt={alt}
        width={500}
        height={500}
      />
      <AvatarFallback>{fallback}</AvatarFallback>
    </Avatar>
  );
};

export default MyAvatar;
