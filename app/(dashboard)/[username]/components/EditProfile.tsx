import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useEditProfile } from "@/hooks/useEditProfile";
import { UserProps } from "@/lib/types";
import { UserPen } from "lucide-react";
import { Dispatch, SetStateAction } from "react";

const EditProfile = ({
  profile,
  setOpenEdit,
  openEdit,
}: {
  profile: UserProps;
  openEdit: boolean;
  setOpenEdit: Dispatch<SetStateAction<boolean>>;
}) => {
  const { form, setForm, saveProfile } = useEditProfile(profile.uid, profile);

  return (
    <Dialog open={openEdit} onOpenChange={setOpenEdit}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <UserPen className="h-4 w-4" /> Edit Profile
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit profile</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid gap-2">
            <label className="text-sm">Full name</label>
            <Input
              value={form.fullName}
              onChange={e => setForm(s => ({ ...s, fullName: e.target.value }))}
            />
          </div>
          <div className="grid gap-2">
            <label className="text-sm">Bio</label>
            <Textarea
              rows={4}
              value={form.bio}
              onChange={e => setForm(s => ({ ...s, bio: e.target.value }))}
            />
          </div>
          <div className="grid gap-2">
            <label className="text-sm">Website</label>
            <Input
              type="url"
              value={form.website}
              onChange={e => setForm(s => ({ ...s, website: e.target.value }))}
            />
          </div>
          <div className="grid gap-2">
            <label className="text-sm">Location</label>
            <Input
              value={form.location}
              onChange={e => setForm(s => ({ ...s, location: e.target.value }))}
            />
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setOpenEdit(false)}>
            Cancel
          </Button>
          <Button onClick={saveProfile}>Save</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EditProfile;
