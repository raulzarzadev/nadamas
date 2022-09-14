import { useRouter } from "next/router";
import { QRCodeSVG } from "qrcode.react";
import { useState } from "react";
import PROJECT_INFO from "../../CONSTANTS/PROJECT_INFO";
import Icon from "../Icon";
import { ICONS } from "../Icon/icon-list";
import CopyButton from "../Inputs/CopyButton";
import Modal from "../Modal";

const ShareButton = () => {
  const [openModal, setOpenModal] = useState(false);
  const handleOpenModal = () => {
    setOpenModal(!openModal);
  };
  const { asPath } = useRouter();

  const fullPath = `https://${PROJECT_INFO.domain}${asPath}`;

  return (
    <div>
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          handleOpenModal();
        }}
      >
        <Icon name={ICONS.share} />
      </button>
      <Modal title="Compartir" open={openModal} handleOpen={handleOpenModal}>
        <p className="text-center my-2">Copia el link</p>
        <label htmlFor="username" type="text">
          Link:
        </label>
        <div className="flex ">
          <input
            className="shadow appearance-none border rounded w-full py-2 px-3 leading-tight focus:outline-none focus:shadow-outline"
            id="username"
            value={fullPath}
            readOnly
          />
          <CopyButton value={fullPath} />
        </div>
        <div className="w-full my-2 mt-4">
          <p className="text-center my-2">o</p>
          <p className="text-center my-2">Escanea codigo QR</p>
          <QRCodeSVG
            value={fullPath}
            size={120}
            className="mx-auto rounded-2xl p-1 bg-white border-4 border-transparent hover:border-primary cursor-pointer"
          />
        </div>
      </Modal>
    </div>
  );
};

export default ShareButton;
