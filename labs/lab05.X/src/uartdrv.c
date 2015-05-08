#include "uartdrv.h"

#include "uartdrv.h"

void __attribute__((interrupt(ipl0), vector(_UART1_VECTOR))) vUART1_ISR_Wrapper(void);

void initUART(UART_MODULE umPortNum, uint32_t ui32WantedBaud)
{
    //UART TX Queue Init
    UBaseType_t uxQueueLength = 20;
    UBaseType_t uxItemSize;

    uxItemSize = sizeof(xUARTMessage);
    
    xUARTQueue = xQueueCreate
    (
        uxQueueLength,
        uxItemSize
    );
    //Queue Init done


    /* Variables */


    /* UART Configuration */
    UARTConfigure(umPortNum, UART_ENABLE_PINS_TX_RX_ONLY);

    /* UART FIFO Mode */
    UARTSetFifoMode(umPortNum, UART_INTERRUPT_ON_TX_NOT_FULL |
                               UART_INTERRUPT_ON_RX_NOT_EMPTY);

    /* UART Line Control */
    UARTSetLineControl(umPortNum, UART_DATA_SIZE_8_BITS |
                                  UART_PARITY_NONE |
                                  UART_STOP_BITS_1);

    /* Set the Baud Rate of the UART */
    UARTSetDataRate(umPortNum,
            (uint32_t)configPERIPHERAL_CLOCK_HZ, ui32WantedBaud);

    /* Enable the UART for Transmit Only*/
    UARTEnable(umPortNum, UART_ENABLE_FLAGS(UART_PERIPHERAL |
                                            UART_TX |
                                            UART_RX));

    /* Set UART INterrupt Vector Priority*/
    INTSetVectorPriority(INT_VECTOR_UART(UART1), INT_PRIORITY_LEVEL_2);

    /* Enable RX INterrupt */
    INTEnable(INT_SOURCE_UART_RX(umPortNum), INT_ENABLED);
    /* INTEnable(INT_SOURCE_UART_TX(umPortNum), INT_ENABLED); */ /* Only do this when ready to transmit */


}


void vUART1_ISR(void)
{
    /* Variables */
    static portBASE_TYPE xHigherPriorityTaskWoken;

    // YOUR RX AND TX operations go HERE. When the ISR runs, you will need to
    // detect if the RX or TX flag caused the interrupt. Priority should be given
    // to the RX interrupt. That is, the RX operation code should be run and the
    // ISR exited. Then the CPU will be interrupt again from the currently
    // pending TX interrupt that did not get handle the last time. The interrupt
    // flags can be checked using the plib.

    xHigherPriorityTaskWoken = xTaskResumeFromISR(xUARTRXHandle);


    /* If sending or receiving necessitates a context switch, then switch now. */
    portEND_SWITCHING_ISR( xHigherPriorityTaskWoken );
}


/*
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
     
    // Set the Baud Rate of the UART
    UARTSetDataRate(umPortNum, (uint32_t)configPERIPHERAL_CLOCK_HZ, ui32WantedBaud);
    // Enable the UART for Transmit Only
    UARTEnable(umPortNum, UART_ENABLE_FLAGS(UART_PERIPHERAL | UART_TX));


}
*/

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
 
