$body = @{
    contactId = "MlqDIrCQRTsXAclzPsKH"
    transcript = @"
Asesor: Hola, soy Radar, el asistente de Sixteam. Estamos aqui para ayudarte a identificar donde tiene mas sentido mejorar tu negocio, ya sea resolviendo un problema, automatizando un proceso o implementando tecnologia. Para empezar, me dices tu nombre, el nombre de tu empresa y a que se dedican?

Cliente: Natalia me escribio el sabado

Asesor: Listo, lo tengo en cuenta. Natalia te escribio por algo relacionado con el negocio o era un tema personal? Si es algo que impacta en la empresa, cuentame un poco mas para saber si hay algo que debamos revisar o incluir en el diagnostico.

Cliente: [Audio] Estoy interesada, hola, estoy interesada en ver como puedo implementar inteligencia artificial en un proceso de compras con las inmobiliarias que yo tengo

Asesor: Perfecto, gracias por aclararlo. Entonces, el foco es implementar inteligencia artificial en el proceso de compras de tus inmobiliarias. Para avanzar bien, te explico como vamos a hacerlo: te voy a hacer algunas preguntas sobre como funciona hoy ese proceso de compras, que te gustaria lograr con la IA y si ya han intentado algo antes. Vamos?

Cliente: Ok

Asesor: Bien. Para empezar, cuentame como funciona hoy el proceso de compras en tus inmobiliarias. Que pasos siguen normalmente y donde ves que se podria mejorar o automatizar con inteligencia artificial?

Cliente: Es que me roban se colitan con los de las ferreteriasy de paso tambien quiero ver como podemos atender leads y calificarlos me llegan cientos de lead y ninguno tiene plata

Asesor: Eso tiene logica, es un dolor comun en el sector. Entonces tienes dos frentes: evitar fugas o robos en compras con ferreterias y mejorar la atencion y calificacion de leads porque llegan muchos, pero pocos realmente tienen capacidad de compra. Para entender bien, dime: Sobre el tema de compras, como detectas hoy que hay fugas o robos? Tienes algun control o todo es manual? Sobre los leads, como los recibes y quien los atiende? Tienes algun filtro o todo entra igual?
"@
} | ConvertTo-Json -Depth 5

$response = Invoke-WebRequest `
    -Uri "http://localhost:3001/webhook/ghl" `
    -Method POST `
    -ContentType "application/json" `
    -Body $body

Write-Host "Status: $($response.StatusCode)"
Write-Host "Response: $($response.Content)"
