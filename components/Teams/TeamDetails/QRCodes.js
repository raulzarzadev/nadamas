import MainModal from "../../Modal/MainModal"
import { QRCodeSVG } from 'qrcode.react';
import { useState } from "react";
import Link from "next/link";

const QRCodes = ({ codes = [] }) => {


  return (
    <div className="flex w-full justify-evenly">
      {codes.map(({ label, value }) =>
        <div key={label} >

          <MainModal buttonLabel={label} title={`${label}`}>
            <div>
              <Link href={value} >
                <a target='__blank'>
                  <QRCodeSVG value={value} size={240} className='mx-auto rounded-2xl p-4 bg-white border-4 border-transparent hover:border-primary cursor-pointer' />
                </a>
              </Link>
            </div>
          </MainModal>
        </div>
      )}
    </div>
  )
}

export default QRCodes
