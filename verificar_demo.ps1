<#
  Smoke test del modulo de Inteligencia de Ventas (ML + scraping).
  Verifica el pipeline end-to-end contra el ml_service ya levantado.

  Uso:
    .\verificar_demo.ps1 -NegocioId <UUID>
    .\verificar_demo.ps1 -NegocioId <UUID> -MlToken <token> -MlUrl http://localhost:8001

  Nota: archivo en ASCII puro a proposito, para que Windows PowerShell 5.1 lo
  ejecute igual sin importar la codificacion del sistema.
#>
param(
  [Parameter(Mandatory = $true)][string]$NegocioId,
  [string]$MlToken = "demo-ml-token-7f3a9c2e1b8d4056a1c2",
  [string]$MlUrl = "http://localhost:8001"
)

function Ok($m)   { Write-Host "  [OK]    $m" -ForegroundColor Green }
function Bad($m)  { Write-Host "  [FALLO] $m" -ForegroundColor Red }

$headers = @{ Authorization = "Bearer $MlToken" }
$fallos = 0

Write-Host "`n1) Salud del ml_service ($MlUrl)..."
try {
  $h = Invoke-RestMethod "$MlUrl/health"
  if ($h.status -eq "ok") { Ok "ml_service responde" } else { Bad "estado inesperado: $($h.status)"; $fallos++ }
} catch { Bad $_.Exception.Message; Write-Host "`nEsta levantado el stack? docker compose up -d"; exit 1 }

Write-Host "`n2) Recomendaciones (se espera modo 'forecast')..."
try {
  $body = @{ negocio_id = $NegocioId; horizonte_dias = 7 } | ConvertTo-Json
  $r = Invoke-RestMethod "$MlUrl/recomendaciones/generar" -Method Post -Headers $headers -ContentType "application/json" -Body $body
  Ok "modo=$($r.modo)  items=$($r.items.Count)  ingreso_total=$($r.resumen.ingreso_total)"
  if ($r.modo -ne "forecast") { Bad "se esperaba 'forecast' (corriste seed_demo.py?)"; $fallos++ }
} catch { Bad $_.Exception.Message; $fallos++ }

Write-Host "`n3) Recalcular alertas de precio..."
try {
  $body = @{ negocio_id = $NegocioId } | ConvertTo-Json
  $a = Invoke-RestMethod "$MlUrl/alertas/recalcular" -Method Post -Headers $headers -ContentType "application/json" -Body $body
  Ok "alertas_generadas=$($a.alertas_generadas)"
} catch { Bad $_.Exception.Message; $fallos++ }

Write-Host "`n4) Listar alertas persistidas..."
try {
  $al = Invoke-RestMethod "$MlUrl/alertas/precios?negocio_id=$NegocioId&limit=20" -Headers $headers
  Ok "alertas en BD=$($al.total)"
} catch { Bad $_.Exception.Message; $fallos++ }

Write-Host ""
if ($fallos -eq 0) { Write-Host "Smoke test OK - demo lista." -ForegroundColor Green }
else { Write-Host "Smoke test con $fallos fallo(s) - revisar arriba." -ForegroundColor Red; exit 1 }
