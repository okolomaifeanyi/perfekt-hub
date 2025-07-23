export const userAltImageUrl = ({ name }: { name: string }) => {
  const url = `https://ui-avatars.com/api/?name=${encodeURIComponent(
    name
  )}&background=4F46E5&color=fff&rounded=true&size=128`;

  return url
};
