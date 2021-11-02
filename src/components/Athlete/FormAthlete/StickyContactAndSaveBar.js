import { ContactIcon, EmailIcon, SaveIcon } from "@/src/utils/Icons";
import Button from "@comps/inputs/Button";

export default function StickyContactAndSaveBar ({ mobile, email, showSaveButton, ws_text }) {
  return (
    <div className="sticky top-0 bg-gray-700 z-10 p-2 flex justify-evenly  ">
      <div className="m-2 flex items-center relative">
        <Button
          size="sm"
          disabled={!mobile}
          href={`https://wa.me/521${mobile}?text=${ws_text}`}
        >
          <ContactIcon />
        </Button>
      </div>
      <div className="m-2 flex items-center">
        <Button
          size="sm"
          disabled={!email}
          href={`mailto:${email}?subject=Natación`}
        >
          <EmailIcon />
        </Button>
      </div>
      {showSaveButton && (
        <div className="m-2 flex items-center ">
          <Button size="sm" variant="secondary">
            guardar
            <SaveIcon />
          </Button>
        </div>
      )}
    </div>
  )
}
