# ============================================================
#  UCNL Actividades - Lanzador de Servidor de Notificaciones
# ============================================================

$Host.UI.RawUI.WindowTitle = "UCNL Servidor de Notificaciones"
$serverDir  = $PSScriptRoot
$nodeScript = Join-Path $serverDir "server.js"

# ── Helpers visuales ──────────────────────────────────────────

function Show-Header {
    Clear-Host
    Write-Host ""
    Write-Host "  +============================================================+" -ForegroundColor Cyan
    Write-Host "  |     UCNL Actividades - Servidor de Notificaciones          |" -ForegroundColor Cyan
    Write-Host "  +============================================================+" -ForegroundColor Cyan
    Write-Host ""
}

function Get-Status {
    try {
        return Invoke-RestMethod -Uri "http://localhost:3001/api/status" -TimeoutSec 3
    } catch {
        return $null
    }
}

function Show-Info($s) {
    Write-Host "  +------------------------------------------------------------+" -ForegroundColor Green
    Write-Host "  |   [OK] SERVIDOR EN LINEA                                  |" -ForegroundColor Green
    Write-Host "  |------------------------------------------------------------|" -ForegroundColor DarkGreen
    Write-Host ("  |   IP Externa :  http://{0}:3001" -f $s.externalIp) -ForegroundColor White
    Write-Host ("  |   IP Local   :  http://{0}:3001" -f $s.localIp) -ForegroundColor White
    Write-Host ("  |   API Status :  http://{0}:3001/api/status" -f $s.externalIp) -ForegroundColor White
    Write-Host ("  |   Activo desde hace: {0}" -f $s.uptimeHuman) -ForegroundColor Yellow
    Write-Host ("  |   Dispositivos:  {0} tokens FCM registrados" -f $s.registeredDevicesCount) -ForegroundColor Magenta
    Write-Host "  +------------------------------------------------------------+" -ForegroundColor Green
    Write-Host ""
}

function Stop-Server {
    $stopped = $false
    Get-Process -Name "node" -ErrorAction SilentlyContinue | ForEach-Object {
        try {
            $wmi = Get-WmiObject Win32_Process -Filter "ProcessId=$($_.Id)" -ErrorAction SilentlyContinue
            if ($wmi -and $wmi.CommandLine -like "*server.js*") {
                Stop-Process -Id $_.Id -Force -ErrorAction Stop
                Write-Host ("  >> Servidor detenido (PID {0})." -f $_.Id) -ForegroundColor Green
                $stopped = $true
            }
        } catch {}
    }
    if (-not $stopped) {
        Write-Host "  >> No se encontro el proceso del servidor." -ForegroundColor Yellow
    }
}

# ── Pantalla inicial ──────────────────────────────────────────
Show-Header

$status = Get-Status

# =============================================================
#  CASO A: El servidor YA esta corriendo
# =============================================================
if ($null -ne $status) {

    Write-Host "  [!] El servidor ya esta en linea." -ForegroundColor Yellow
    Write-Host ""
    Show-Info $status

    Write-Host "  +-- Opciones ---------------------------------------------------+" -ForegroundColor Cyan
    Write-Host "  |  C     ->  Cerrar el servidor y salir                        |" -ForegroundColor Red
    Write-Host "  |  H     ->  Ocultar esta ventana  (servidor sigue corriendo)  |" -ForegroundColor Yellow
    Write-Host "  |  Enter ->  Salir sin cambios                                 |" -ForegroundColor Gray
    Write-Host "  +---------------------------------------------------------------+" -ForegroundColor Cyan
    Write-Host ""

    $key = Read-Host "  Ingresa una opcion [C / H / Enter]"

    switch ($key.Trim().ToUpper()) {

        "C" {
            Write-Host ""
            Write-Host "  Cerrando servidor..." -ForegroundColor Red
            Stop-Server
            Start-Sleep -Seconds 2
            Write-Host "  Hasta luego." -ForegroundColor Gray
            Start-Sleep -Seconds 1
        }

        "H" {
            Write-Host ""
            Write-Host "  El servidor sigue corriendo en segundo plano." -ForegroundColor Yellow
            Write-Host "  Puedes cerrar esta ventana." -ForegroundColor Gray
            Start-Sleep -Seconds 2
        }

        default {
            Write-Host ""
            Write-Host "  Sin cambios. Saliendo." -ForegroundColor Gray
            Start-Sleep -Seconds 1
        }
    }

    exit
}

# =============================================================
#  CASO B: El servidor NO esta corriendo -> iniciarlo
# =============================================================

Write-Host "  [*] Servidor no detectado. Iniciando en segundo plano..." -ForegroundColor Cyan
Write-Host ""

# Arrancar node como proceso oculto (sin ventana propia)
$pInfo = New-Object System.Diagnostics.ProcessStartInfo
$pInfo.FileName         = "node"
$pInfo.Arguments        = "`"$nodeScript`""
$pInfo.WorkingDirectory = $serverDir
$pInfo.WindowStyle      = [System.Diagnostics.ProcessWindowStyle]::Hidden
$pInfo.UseShellExecute  = $true

try {
    $proc = [System.Diagnostics.Process]::Start($pInfo)
    Write-Host ("  [*] Proceso node iniciado con PID {0}." -f $proc.Id) -ForegroundColor Gray
} catch {
    Write-Host "  [X] Error al iniciar el servidor: $_" -ForegroundColor Red
    Write-Host "      Verifica que Node.js este instalado correctamente." -ForegroundColor Red
    Write-Host ""
    Write-Host "  Presiona cualquier tecla para salir..." -ForegroundColor Gray
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
    exit 1
}

# Esperar a que arranque
Write-Host "  [*] Esperando que el servidor arranque" -ForegroundColor Gray -NoNewline
for ($i = 0; $i -lt 5; $i++) {
    Start-Sleep -Milliseconds 700
    Write-Host "." -ForegroundColor Gray -NoNewline
}
Write-Host ""

$status = Get-Status
Show-Header

if ($null -ne $status) {

    Show-Info $status
    Write-Host "  Esta ventana se cerrara automaticamente en:" -ForegroundColor Gray
    Write-Host ""

    for ($i = 5; $i -ge 1; $i--) {
        $plural = if ($i -eq 1) { "segundo " } else { "segundos" }
        Write-Host ("  >> {0} {1}...   `r" -f $i, $plural) -ForegroundColor Yellow -NoNewline
        Start-Sleep -Seconds 1
    }

    Write-Host "  Ventana cerrada. Servidor corriendo en segundo plano.     " -ForegroundColor Green
    Start-Sleep -Milliseconds 600

} else {
    Write-Host "  [!] El servidor no respondio tras el arranque." -ForegroundColor Red
    Write-Host "      Puede tardar mas segundos. Intenta ejecutar launch.bat de nuevo." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "  Presiona cualquier tecla para salir..." -ForegroundColor Gray
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
}
