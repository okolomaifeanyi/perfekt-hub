import { List } from "@/components/Typography";
import { ChevronRightIcon, UserIcon } from "@heroicons/react/24/solid";
import Link from "next/link";
import NavBar from "../[username]/components/NavBar";

const page = () => {
  return (
    <section>
      <NavBar title="Setting and Privacy" />

        <List className="list-none !m-4">
          <li>
            <Link
              href="/settings/account"
              className="flex items-center justify-between w-full px-3 py-2 rounded-md hover:bg-accent/50"
            >
              <div className="flex space-x-2 items-center">
                <UserIcon className="size-5" />
                <span>Your Account</span>
              </div>
              <ChevronRightIcon className="size-5" />
            </Link>
          </li>
        </List>
    </section>
  );
};

export default page;
