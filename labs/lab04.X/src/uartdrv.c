#include "uartdrv.h"



void initUART(UART_MODULE umPortNum, uint32_t ui32WantedBaud)
{
    //Queue Init
    UBaseType_t uxQueueLength = 20;
    UBaseType_t uxItemSize;

    uxItemSize = sizeof(xUARTMessage);
    
     xUARTQueue = xQueueCreate
    (
        uxQueueLength,
        uxItemSize
    );
    //Queue Init done
     
    /* Set the Baud Rate of the UART */
    UARTSetDataRate(umPortNum, (uint32_t)configPERIPHERAL_CLOCK_HZ, ui32WantedBaud);
    /* Enable the UART for Transmit Only*/
    UARTEnable(umPortNum, UART_ENABLE_FLAGS(UART_PERIPHERAL | UART_TX));


}

void vUartPutC(UART_MODULE umPortNum, char cByte)
{
    int test = 0;
    //wait until the transmitter is ready
    /*
    if(UARTTransmitterIsReady(umPortNum))
    {
        test = 1;
    }
    else
    {
        test = 2;
    }
    */
    while(UARTTransmitterIsReady(umPortNum) == 0)
    {
        vTaskDelay(2); // delay for 2ms every time it isn't ready
    }
    UARTSendDataByte(umPortNum, cByte); // once it's ready, send the data
}

void vUartPutStr(UART_MODULE umPortNum, char *pString, int iStrLen)
{
    int i;
    for(i = 0; i < iStrLen; i++)
    {
        vUartPutC(umPortNum, pString[i] ); //problem dereferencing pString
    }
}
 
