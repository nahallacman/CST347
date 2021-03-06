/* 
 * File:   uartdrv.h
 * Author: mainuser
 *
 * Created on April 21, 2015, 2:20 AM
 */

#ifndef UARTDRV_H
#define	UARTDRV_H

#ifdef	__cplusplus
extern "C" {
#endif
    
#include <stdint.h>
#include <plib.h>

    #include <FreeRTOS.h>
    #include "task.h"
#include "queue.h"
#include "myTasks.h"

#include "IncludeCommon.h"

    //Task and Queue stuff for UART
TaskHandle_t xUARTTXHandle;
TaskHandle_t xUARTRXHandle;

QueueHandle_t xUARTQueue;

void initUART(UART_MODULE umPortNum, uint32_t ui32WantedBaud);

//void vUartPutC(UART_MODULE umPortNum, char cByte);
//
//void vUartPutStr(UART_MODULE umPortNum, char *pString, int iStrLen);

//does it need the UART_MODULE?
char * vUartGetChar(UART_MODULE umPortNum);


//buffer, get and set wrapping functionality for receiving characters
char UARTRXChar;
char UARTGetChar(void);
void UARTSetChar(char in);

//buffer and index for TX functionality
char TXbuffer[50];
int TXIndex;
void UARTPutString(char * string);
void ClearBuffer(void);


#ifdef	__cplusplus
}
#endif

#endif	/* UARTDRV_H */

