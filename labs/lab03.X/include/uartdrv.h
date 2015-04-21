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

void initUART(UART_MODULE umPortNum, uint32_t ui32WantedBaud);

void vUartPutC(UART_MODULE umPortNum, char cByte);

void vUartPutStr(UART_MODULE umPortNum, char *pString, int iStrLen);


#ifdef	__cplusplus
}
#endif

#endif	/* UARTDRV_H */

