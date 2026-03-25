export function calcularIMC(peso: number, altura: number): { imc: number; classificacao: string } {
  const imc = Number((peso / (altura * altura)).toFixed(1));

  if (imc < 18.5) return { imc, classificacao: "baixo peso" };
  if (imc < 25) return { imc, classificacao: "normal" };
  if (imc < 30) return { imc, classificacao: "sobrepeso" };
  if (imc < 35) return { imc, classificacao: "obesidade grau I" };
  if (imc < 40) return { imc, classificacao: "obesidade grau II" };
  return { imc, classificacao: "obesidade grau III" };
}
