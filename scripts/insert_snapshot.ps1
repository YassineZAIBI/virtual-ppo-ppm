 = "C:\Users\yassi\Desktop\Pockey_POPM\virtual-ppo-ppm\prisma\schema.prisma"
 = Get-Content 
 = @()
foreach ( in ) {
     += 
    if ( -match "viewCount\s+Int\s+@default\(0\)") {
         += "  dataSnapshot Json?"
    }
}
 | Set-Content  -Encoding UTF8
Write-Host "Done. Line count before:" .Count "after:" .Count
