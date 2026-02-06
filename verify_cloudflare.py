# verify_cloudflare.py
import asyncio
import json

import aiohttp


async def verify_token_and_get_accounts(api_token: str):
    """Verifica el token y obtiene las cuentas disponibles"""
    headers = {
        "Authorization": f"Bearer {api_token}",
        "Content-Type": "application/json",
    }

    print("🔍 Verificando token de Cloudflare...")

    async with aiohttp.ClientSession() as session:
        # Primero, prueba el endpoint de user para verificar token
        try:
            print("1. Verificando token con endpoint de usuario...")
            async with session.get(
                "https://api.cloudflare.com/client/v4/user", headers=headers
            ) as response:
                user_data = await response.json()
                if response.status == 200 and user_data.get("success"):
                    print(f"✅ Token válido")
                    print(f"   Email: {user_data['result']['email']}")
                else:
                    print(
                        f"❌ Token inválido: {user_data.get('errors', [{}])[0].get('message', 'Unknown error')}"
                    )
                    return
        except Exception as e:
            print(f"❌ Error verificando token: {e}")
            return

        # Ahora obtén las cuentas
        print("\n2. Obteniendo cuentas disponibles...")
        try:
            async with session.get(
                "https://api.cloudflare.com/client/v4/accounts", headers=headers
            ) as response:
                if response.status == 200:
                    data = await response.json()
                    if data.get("success"):
                        accounts = data["result"]
                        if accounts:
                            print(f"✅ Encontradas {len(accounts)} cuenta(s):\n")
                            for i, account in enumerate(accounts, 1):
                                print(f"Cuenta #{i}:")
                                print(f"  Nombre: {account['name']}")
                                print(f"  ID: {account['id']}")
                                print(f"  Tipo: {account.get('type', 'N/A')}")
                                print(f"  Estado: {account.get('status', 'N/A')}")
                                print()

                            # Guardar el primer account_id en un archivo para uso futuro
                            with open(".cloudflare_account.txt", "w") as f:
                                f.write(accounts[0]["id"])
                            print(f"📝 Account ID guardado en: .cloudflare_account.txt")
                        else:
                            print("⚠️  No se encontraron cuentas asociadas a este token")
                            print("\nPosibles causas:")
                            print(
                                "  - El token puede no tener permisos para ver cuentas"
                            )
                            print("  - Puedes necesitar un token de nivel Account")
                    else:
                        errors = data.get("errors", [])
                        if errors:
                            print(f"❌ Error de API: {errors[0].get('message')}")
                            print(f"   Código: {errors[0].get('code')}")
                else:
                    print(f"❌ Error HTTP {response.status}")
                    try:
                        error_text = await response.text()
                        print(f"   Detalles: {error_text}")
                    except:
                        pass
        except Exception as e:
            print(f"❌ Error obteniendo cuentas: {e}")


async def main():
    api_token = input("Ingresa tu API Token de Cloudflare: ").strip()
    await verify_token_and_get_accounts(api_token)


if __name__ == "__main__":
    asyncio.run(main())
