import { updateAtlete } from '@/legasy/firebase/athletes'
import Avatar from '@/legasy/src/components/Avatar'
import UploadImage from '@/legasy/src/components/inputs/UploadImage'
import Image from 'next/image'
export default function SectionImage({
  avatar,
  setAvatar,
  athleteId,
  isEditable
}) {
  const upladedImage = (url) => {
    setAvatar(url)
    updateAtlete({ id: athleteId, avatar: url })
      .then((res) => console.log(`res`, res))
      .catch((err) => console.log(`err`, err))
  }
  return (
    <>
      {!avatar && (
        <div className=" bottom-0 right-0 flex pt-4">
          <div className="mx-2">Sube una foto</div>
          <UploadImage
            upladedImage={upladedImage}
            storeRef={`avatar/${athleteId}`}
            isEditable={isEditable}
          />
        </div>
      )}
      {avatar && (
        <div className=" hidden sm:block relative">
          <Avatar upload id={athleteId} image={avatar} />
          <div className="absolute bottom-0 right-0">
            <UploadImage
              upladedImage={upladedImage}
              storeRef={`avatar/${athleteId}`}
              isEditable={isEditable}
            />
          </div>
        </div>
      )}
      {avatar && (
        <div className="w-full h-28 relative sm:hidden">
          <Image src={avatar} layout="fill" objectFit="cover" />
          <div className="absolute bottom-2 right-2">
            <UploadImage
              upladedImage={upladedImage}
              storeRef={`avatar/${athleteId}`}
              isEditable={isEditable}
            />
          </div>
        </div>
      )}
    </>
  )
}
