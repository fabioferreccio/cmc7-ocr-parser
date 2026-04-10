/**
 * Calcula o dígito verificador Módulo 10.
 * Utilizado na maioria dos campos numéricos da FEBRABAN (ex: agência, conta).
 * @param digits String contendo os dígitos do campo.
 * @returns O dígito verificador calculado.
 */
export function mod10(digits: string): number {
  let sum = 0;
  let weight = 2; // Começa da direita com o peso 2

  for (let i = digits.length - 1; i >= 0; i--) {
    const d = parseInt(digits[i]!, 10);
    if (isNaN(d)) continue; // ignore non-digits

    let product = d * weight;
    if (product > 9) {
      product -= 9; // Equivalente a somar os dígitos de um numero de dois digitos (<= 18)
    }

    sum += product;
    weight = weight === 2 ? 1 : 2; // Alterna pesos entre 2 e 1
  }

  const remainder = sum % 10;
  return remainder === 0 ? 0 : 10 - remainder;
}

/**
 * Calcula o dígito verificador Módulo 11.
 * Utilizado por alguns bancos ou no banco universal de boleto.
 * @param digits String contendo os dígitos do campo.
 * @param weights Pesos customizados caso o banco adote um conjunto diferente do padrão 2-7.
 * @returns O número do DV, ou a string 'X' se for o caso especial do resto 1.
 */
export function mod11(digits: string, weights: number[] = [2, 3, 4, 5, 6, 7]): number | string {
  let sum = 0;
  let weightIndex = 0;

  for (let i = digits.length - 1; i >= 0; i--) {
    const d = parseInt(digits[i]!, 10);
    if (isNaN(d)) continue;

    const weight = weights[weightIndex % weights.length]!;
    sum += d * weight;
    weightIndex++;
  }

  const remainder = sum % 11;
  const subtraction = 11 - remainder;

  if (subtraction === 10) return 'X';
  if (subtraction === 11) return 0;
  
  return subtraction;
}

/**
 * Valida uma string contendo valores e seu respectivo dígito verificador no final.
 * @param valueWithDv Ex: '123455' onde os dígitos são '12345' e o DV forncecido é '5'.
 * @param type O tipo de módulo ('mod10' ou 'mod11').
 * @param weights Array opcional de pesos para o mod11.
 * @returns true se o DV confere, false caso contrário.
 */
export function validateField(valueWithDv: string, type: 'mod10' | 'mod11', weights?: number[]): boolean {
  if (!valueWithDv || valueWithDv.length < 2) return false;

  const digits = valueWithDv.slice(0, -1);
  const providedDv = valueWithDv.slice(-1);

  if (type === 'mod10') {
    const computed = mod10(digits);
    return computed.toString() === providedDv;
  } else {
    const computed = mod11(digits, weights);
    return computed.toString() === providedDv.toUpperCase();
  }
}

