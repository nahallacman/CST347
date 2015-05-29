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
//    int test = 0;

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

//    test = UARTGetDataRate(umPortNum,
//            (uint32_t)configPERIPHERAL_CLOCK_HZ);
    
    /* Enable the UART for Transmit Only*/
    UARTEnable(umPortNum, UART_ENABLE_FLAGS(UART_PERIPHERAL |
                                            UART_TX |
                                            UART_RX));

    /* Set UART INterrupt Vector Priority*/
    INTSetVectorPriority(INT_VECTOR_UART(umPortNum), INT_PRIORITY_LEVEL_2);

    /* Enable RX INterrupt */
    INTEnable(INT_SOURCE_UART_RX(umPortNum), INT_ENABLED);
    /* INTEnable(INT_SOURCE_UART_TX(umPortNum), INT_ENABLED); */ /* Only do this when ready to transmit */

    //make sure the TX buffer is nulled out.
    ClearBuffer();

    InputByteBuffer = xSemaphoreCreateMutex();

    //is this take necessary?
    xSemaphoreTake(
           InputByteBuffer,
           0
    );

    OutputStringBuffer = xSemaphoreCreateMutex();

//    xSemaphoreTake(
//           OutputStringBuffer,
//           portMAX_DELAY
//    );

}


void vUART1_ISR(void)
{
    /* Variables */
    static portBASE_TYPE xHigherPriorityTaskWoken;
    UART_DATA uData;
    char cData;

    // YOUR RX AND TX operations go HERE. When the ISR runs, you will need to
    // detect if the RX or TX flag caused the interrupt. Priority should be given
    // to the RX interrupt. That is, the RX operation code should be run and the
    // ISR exited. Then the CPU will be interrupt again from the currently
    // pending TX interrupt that did not get handle the last time. The interrupt
    // flags can be checked using the plib.
    if(INTGetFlag(INT_U1RX))
    {
        INTClearFlag(INT_U1RX);
        
        uData = UARTGetData(UART1);
        cData = uData.__data;
        //cData = UARTGetData(UART1);

        UARTSetChar(cData);

        //xSemaphoreGive( InputByteBuffer );
        xSemaphoreGiveFromISR
        (
        InputByteBuffer,
        &xHigherPriorityTaskWoken
        );


    }
    else if(INTGetFlag(INT_U1TX))
    {
        INTClearFlag(INT_U1TX);

        //string is already formatted properly,
        //iterate through and send data
        if(TXbuffer[TXIndex] == 0)
        {
            //we are done
            //disable TX interrupt
            INTEnable(INT_U1TX, INT_DISABLED);
            //reset print index
            TXIndex = 0;

            xSemaphoreGiveFromISR
            (
            OutputStringBuffer,
            &xHigherPriorityTaskWoken
            );
        }
        else
        {
            //otherwise send the byte
            UARTSendDataByte(UART1, TXbuffer[TXIndex]);
            //increase the index
            TXIndex++;
        }
    }

        /* If sending or receiving necessitates a context switch, then switch now. */
        portEND_SWITCHING_ISR( xHigherPriorityTaskWoken );
}
 
char UARTGetChar(void)
{
    return UARTRXChar;
}

void UARTSetChar(char in)
{
    UARTRXChar = in;
}

void UARTPutString(char * string)
{
    int i;

    //take the mutex so only one person can send at a time.
    xSemaphoreTake(
           OutputStringBuffer,
           portMAX_DELAY
    );

    //format the string for being sent through interrupts
    //should double check that there is a null on the end of the string
    for(i = 0; i < 50 && string[i] != 0; i++)
    {
        TXbuffer[i] = string[i];
    }
    if(i == 50)
    {
        i--;
    }
    if(TXbuffer[i] != 0)
    {
        TXbuffer[i] = 0;
    }
    //not sure if this is necessary, going to manually trigger an interrupt too
    INTSetFlag(INT_U1TX);
    //enable the interrupt to actually send the information
    INTEnable(INT_U1TX, INT_ENABLED);

}

void ClearBuffer(void)
{
    int i;
    for(i = 0; i < 50; i++)
    {
        TXbuffer[i] = 0;
    }
}