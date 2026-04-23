"use client";

import { useState } from "react";
import { formatCurrency } from "@/lib/utils";

interface PixQRDialogProps {
  brCode: string;
  qrDataUrl: string;
  amount: number;
  onClose: () => void;
}

export function PixQRDialog({
  brCode,
  qrDataUrl,
  amount,
  onClose,
}: PixQRDialogProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(brCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // sem clipboard API: o user pode selecionar do textarea direto
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-sm w-full max-h-[90vh] overflow-y-auto shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-100 sticky top-0 bg-white z-10">
          <p className="text-sm font-semibold">Pagamento via Pix</p>
          <button
            onClick={onClose}
            className="text-zinc-500 hover:text-red-500 text-sm font-medium px-2 py-1 rounded-lg hover:bg-red-50"
            aria-label="Fechar"
          >
            Fechar
          </button>
        </div>

        <div className="p-5 flex flex-col gap-4">
          {/* Valor */}
          <div className="text-center">
            <p className="text-xs uppercase tracking-wide text-zinc-500 font-medium">
              Valor
            </p>
            <p className="text-2xl font-bold text-green mt-1">
              {formatCurrency(amount)}
            </p>
          </div>

          {/* QR Code */}
          <div className="flex justify-center">
            <div className="p-3 bg-white border border-zinc-200 rounded-xl">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={qrDataUrl}
                alt="QR Code Pix"
                width={240}
                height={240}
                className="block"
              />
            </div>
          </div>

          {/* Pix copia-e-cola */}
          <div>
            <p className="text-xs text-zinc-500 mb-1.5 font-medium">
              Pix copia-e-cola
            </p>
            <textarea
              value={brCode}
              readOnly
              rows={3}
              onFocus={(e) => e.currentTarget.select()}
              className="w-full text-xs font-mono bg-zinc-50 border border-zinc-200 rounded-lg p-2.5 resize-none break-all"
            />
            <button
              onClick={handleCopy}
              className={`w-full mt-2 py-2.5 px-3 rounded-xl text-sm font-semibold transition-all ${
                copied
                  ? "bg-green/10 text-green"
                  : "bg-[#32BCAD] text-white hover:bg-[#2aa89b]"
              }`}
            >
              {copied ? "Copiado ✓" : "Copiar codigo"}
            </button>
          </div>

          {/* Instrucoes */}
          <div className="bg-blue/5 border border-blue/15 rounded-xl p-3 text-xs text-zinc-600 leading-relaxed">
            <p className="font-semibold text-blue mb-1">Como pagar:</p>
            <ol className="space-y-0.5 list-decimal list-inside">
              <li>Abra o app do seu banco</li>
              <li>Escolha pagar via Pix copia-e-cola</li>
              <li>Cole o codigo ou leia o QR</li>
              <li>Confirme o pagamento</li>
            </ol>
            <p className="mt-2 text-zinc-500">
              Apos pagar, aguarde o organizador confirmar o recebimento.
              Voce pode fechar essa tela.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
