import type { SectionNode, TaskNode } from "@/types/workspace";

const seedTimestamp = "2026-04-11T00:00:00.000Z";

function section(
  id: string,
  name: string,
  children: SectionNode["children"] = [],
): SectionNode {
  return {
    id,
    type: "section",
    name,
    expanded: true,
    children,
    createdAt: seedTimestamp,
    updatedAt: seedTimestamp,
  };
}

function task(
  id: string,
  title: string,
  description: string,
  done = false,
): TaskNode {
  return {
    id,
    type: "task",
    title,
    description,
    done,
    descriptionExpanded: true,
    createdAt: seedTimestamp,
    updatedAt: seedTimestamp,
  };
}

export const seedWorkspace: SectionNode[] = [
  section("sec-margem-app", "MARGEM APP", [
    section("sec-margem-checkout", "CHECKOUT", [
      task(
        "task-checkout-mapear-fluxo",
        "Mapear fluxo de compra",
        "Descrever cada etapa do checkout, do carrinho ao comprovante, marcando pontos de fricção e decisões pendentes.",
      ),
      task(
        "task-checkout-validar-pagamentos",
        "Validar pagamentos e estados de erro",
        "Listar cenários de cartão recusado, PIX expirado, cupom inválido e tentativa duplicada para garantir mensagens claras.",
      ),
    ]),
    section("sec-margem-admin", "ADMIN", [
      task(
        "task-admin-painel-pedidos",
        "Definir painel de pedidos",
        "Organizar quais campos o operador precisa ver primeiro: cliente, valor, status, origem e última atualização.",
      ),
      task(
        "task-admin-permissoes",
        "Rascunhar níveis de permissão",
        "Separar acesso operacional, financeiro e suporte para evitar que tudo vire uma tela única sem controle.",
        true,
      ),
    ]),
    section("sec-margem-ia", "IA / AUTOMAÇÕES", [
      task(
        "task-ia-triagem",
        "Triagem automática de solicitações",
        "Criar critérios para classificar mensagens por urgência, tipo de problema e próximo responsável.",
      ),
      task(
        "task-ia-resumos",
        "Resumos de atividade por cliente",
        "Gerar checkpoint textual com os últimos pedidos, tickets e alertas relevantes antes de abrir o atendimento.",
      ),
    ]),
  ]),
  section("sec-rivals-ai", "RIVALS AI", [
    section("sec-rivals-feed", "FEED", [
      task(
        "task-feed-card-partida",
        "Desenhar card de partida",
        "Definir como exibir adversario, horario, contexto e chamada para analise sem deixar o feed pesado.",
      ),
      task(
        "task-feed-filtros",
        "Planejar filtros do feed",
        "Separar competições, favoritos e alertas de risco para o usuário chegar rápido no que importa.",
      ),
    ]),
    section("sec-rivals-perfil", "PERFIL", [
      task(
        "task-perfil-historico",
        "Organizar historico do perfil",
        "Listar indicadores que ajudam a entender comportamento recente: interacoes, times acompanhados e preferencias.",
      ),
    ]),
    section("sec-rivals-moderacao", "MODERAÇÃO", [
      task(
        "task-moderacao-fila",
        "Criar fila de revisão",
        "Separar itens sinalizados por categoria, gravidade e prazo para decisão manual.",
      ),
      task(
        "task-moderacao-regras",
        "Escrever regras de conteúdo",
        "Registrar critérios objetivos para aprovar, ocultar ou escalar comentários sensíveis.",
        true,
      ),
    ]),
  ]),
];
