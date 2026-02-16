import useUserName from "./useUserName";

export default function CreatorBadge({ uid }:{ uid?: string | null }){

  const name = useUserName(uid);

  if(!name) return null;

  return (
    <div className="text-xs text-gray-500 mt-1">
      Added by {name}
    </div>
  );
}
