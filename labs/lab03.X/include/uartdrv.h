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

    //Task and Queue stuff for UART
TaskHandle_t xUARTHandle;

QueueHandle_t xUARTQueue;

void initUART(UART_MODULE umPortNum, uint32_t ui32WantedBaud);

void vUartPutC(UART_MODULE umPortNum, char cByte);

void vUartPutStr(UART_MODULE umPortNum, char *pString, int iStrLen);



#ifdef	__cplusplus
}
#endif

#endif	/* UARTDRV_H */

