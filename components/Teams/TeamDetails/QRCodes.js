import MainModal from "../../Modal/MainModal"
import { QRCodeSVG } from 'qrcode.react';
import { useState } from "react";
import Link from "next/link";
import CopyButton from "../../Inputs/CopyButton";

const QRCodes = ({ codes = [] }) => {


  return (
    <div className="flex w-full justify-evenly">
      {codes.map(({ label, value }) =>
        <div key={label} >

          <MainModal buttonLabel={label} title={`${label}`}>
            <div>
              <p className="text-center my-3">
                Escanea o dale click al siguente codigo
              </p>
              <Link href={value} >
                <a target='__blank'>
                  <QRCodeSVG value={value} size={240} className='mx-auto rounded-2xl p-4 bg-white border-4 border-transparent hover:border-primary cursor-pointer' />
                </a>
              </Link>
            </div>
            <div className="flex flex-col justify-center items-center ">
              <span className="my-2">O copia y pega este link</span>
              <div className="  text-2xs text-center">
                <CopyButton value={value} />
                <p className=" whitespace-pre">
                  {value}
                </p>
              </div>
            </div>
          </MainModal>
        </div>
      )}
    </div>
  )
}
const QRCodes_2 = ({ codes = [] }) => {


  return (
    <div className="">
      {codes.map(({ label, value }) =>
        <div key={label} >

          <div className="relative ">
            <span className="text-xs">
              <div className="x">

              </div>
              {label}
            </span>


            <Link href={value} >
              <a target='__blank'>
                <QRCodeSVG value={value} size={120} className='mx-auto rounded-2xl p-1 bg-white border-4 border-transparent hover:border-primary cursor-pointer' />
              </a>
            </Link>
          </div>
          <div className="  text-2xs text-center flex items-center justify-center">
            <span className="">
              Copiar link
            </span>
            <CopyButton value={value} />
          </div>
        </div>
      )}
    </div>
  )
}

export default QRCodes_2
