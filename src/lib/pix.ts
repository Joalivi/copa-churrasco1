/**
 * Gerador de BR Code Pix estatico (copia-e-cola).
 *
 * Segue o padrao EMV QRCPS (QR Code for Payment Systems) definido pelo
 * Banco Central. Formato: TLV (2-char ID + 2-char len + value).
 *
 * Referencia: https://www.bcb.gov.br/content/estabilidadefinanceira/SPB_docs/ManualBRCode.pdf
 */

export interface PixBRCodeInput {
  /** Chave Pix. Celular em formato E.164: "+5511999999999". */
  chave: string;
  /** Nome do recebedor. Sera normalizado para ASCII upper e truncado em 25 chars. */
  nome: string;
  /** Cidade do recebedor. Sera normalizado para ASCII upper e truncado em 15 chars. */
  cidade: string;
  /** Valor em BRL (ex: 10.50). Use 0 para QR Code sem valor. */
  valor: number;
  /** Identificador da transacao. Alfanumerico, max 25 chars. */
  txid: string;
}

/** Encoda um campo TLV: id + len (2 digitos) + value. */
function tlv(id: string, value: string): string {
  const len = value.length.toString().padStart(2, "0");
  return `${id}${len}${value}`;
}

/**
 * CRC16-CCITT (polinomio 0x1021, init 0xFFFF, sem reflect, sem xor-out).
 * Retorna 4 hex chars em caixa alta.
 */
function crc16(payload: string): string {
  let crc = 0xffff;
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      if (crc & 0x8000) {
        crc = (crc << 1) ^ 0x1021;
      } else {
        crc <<= 1;
      }
      crc &= 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

/**
 * Remove acentos e caracteres nao-ASCII, upercaseia e trunca.
 * EMV BR exige ASCII basico em campos de nome/cidade.
 */
function sanitize(s: string, max: number): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\x20-\x7e]/g, "")
    .toUpperCase()
    .trim()
    .slice(0, max);
}

/** Campo 26: Merchant Account Information - Pix.
 *  GUI em UPPERCASE por compatibilidade (spec BCB usa maiuscula). */
function buildMerchantAccount(chave: string): string {
  const gui = tlv("00", "BR.GOV.BCB.PIX");
  const key = tlv("01", chave);
  return tlv("26", gui + key);
}

/** Campo 62: Additional Data Field Template (com txid). */
function buildAdditionalData(txid: string): string {
  const ref = tlv("05", txid);
  return tlv("62", ref);
}

/**
 * Gera a string Pix copia-e-cola.
 *
 * Exemplo: "00020126580014br.gov.bcb.pix0114+55351234567890520400005303986540510.505802BR5911JOAO CASTRO6015POCOS DE CALDAS62100506copa016304XXXX"
 */
export function gerarPixBRCode(input: PixBRCodeInput): string {
  const nome = sanitize(input.nome, 25);
  const cidade = sanitize(input.cidade, 15);
  const txid = input.txid.replace(/[^a-zA-Z0-9]/g, "").slice(0, 25) || "***";

  if (!input.chave) throw new Error("chave Pix obrigatoria");
  if (!nome) throw new Error("nome do recebedor obrigatorio");
  if (!cidade) throw new Error("cidade do recebedor obrigatoria");

  const campos: string[] = [];
  campos.push(tlv("00", "01"));                     // Payload Format Indicator
  campos.push(buildMerchantAccount(input.chave));   // ID 26
  campos.push(tlv("52", "0000"));                   // MCC
  campos.push(tlv("53", "986"));                    // Currency BRL

  if (input.valor > 0) {
    campos.push(tlv("54", input.valor.toFixed(2))); // Amount
  }

  campos.push(tlv("58", "BR"));                     // Country
  campos.push(tlv("59", nome));                     // Merchant Name
  campos.push(tlv("60", cidade));                   // Merchant City
  campos.push(buildAdditionalData(txid));           // ID 62

  // Prepara para CRC (inclui id+len do proprio campo CRC, sem o valor)
  const payloadBase = campos.join("") + "6304";
  const crc = crc16(payloadBase);

  return payloadBase + crc;
}

/**
 * Gera um txid curto e unico para usar no BR Code.
 * Formato: "copa" + timestamp (base36) + 4 chars aleatorios.
 * Resultado tipico: "copakx3m9f4q2z" (~14 chars).
 */
export function gerarTxid(): string {
  const ts = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 6);
  return `copa${ts}${rand}`.replace(/[^a-zA-Z0-9]/g, "").slice(0, 25);
}
