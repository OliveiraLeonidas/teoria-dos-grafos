"""Erros de regra de negócio do CurriculoService (a API os converte em HTTP)."""

from typing import Any


class ErroNegocio(Exception):
    def __init__(self, mensagem: str, **detalhes: Any) -> None:
        super().__init__(mensagem)
        self.mensagem = mensagem
        self.detalhes = detalhes


class ErroValidacao(ErroNegocio):
    """Dados de entrada inválidos (HTTP 400)."""


class NaoEncontrado(ErroNegocio):
    """Registro inexistente (HTTP 404)."""


class Conflito(ErroNegocio):
    """Operação que viola uma restrição: duplicidade ou ciclo (HTTP 409)."""
