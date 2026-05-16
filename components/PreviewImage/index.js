'use client'
import Image from "next/image";
import { useState } from "react";
import Modal from "../Modal";

const PreviewImage = ({
  label = null,
  image = null,
  canOpenModal = true,
  previewSize = "md",
  previewClassName,
  modalImageSize = "lg",
}) => {
  const [openModal, setOpenModal] = useState(false);
  const handleOpenModal = () => setOpenModal(!openModal);

  const previewSizing = {
    sm: "w-32 aspect-video",
    md: "w-48 aspect-video",
    lg: "w-64 aspect-video",
    xl: "w-96 aspect-video",
    "full-w": "w-full h-32",
  };

  return (
    <div className="">
      {image ? (
        <div className="">
          {label && <span className="">{label}</span>}
          <div
            className={`
             ${previewSizing[previewSize]}
             ${previewClassName} 
            relative  
            mx-auto 
            opacity-60 
            hover:opacity-100 
            shadow-lg 
            m-1 
            `}
            onClick={(e) => {
              canOpenModal && handleOpenModal();
            }}
          >
            <Image
              src={image}
              fill
              style={{ objectFit: "cover" }}
              placeholder="blur"
              blurDataURL={`/images/defaultBlurImage-small.jpg`}
              alt={label || ""}
            />
          </div>
          <Modal
            modalSize={modalImageSize}
            title="Image"
            open={openModal}
            handleOpen={handleOpenModal}
          >
            <div className="relative w-full aspect-video mx-auto">
              <Image
                fill
                style={{ objectFit: "contain" }}
                placeholder="blur"
                blurDataURL={`/images/defaultBlurImage-small.jpg`}
                src={image}
                alt={label || ""}
              />
            </div>
          </Modal>
        </div>
      ) : (
        <span className="italic">No image</span>
      )}
    </div>
  );
};

export default PreviewImage;
