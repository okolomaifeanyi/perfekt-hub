import { DeleteAccountModal } from "@/components/DeleteAccount";
import { List } from "@/components/Typography";
import NavBar from "../../[username]/components/NavBar";

const page = () => {
  return (
    <section>
      <NavBar title="Your Account" />

      <List className="list-none !m-4">
        {/* <li>Manage your account settings</li>
        <li>Change your password</li> */}
        <li>
          <DeleteAccountModal />
        </li>
      </List>
    </section>
  );
};

export default page;
