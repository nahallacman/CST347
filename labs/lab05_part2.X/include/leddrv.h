/* 
 * File:   leddrv.h
 * Author: mainuser
 *
 * Created on April 2, 2015, 7:48 PM
 */

#ifndef LEDDRV_H
#define	LEDDRV_H

#include <peripheral/int.h>
#include <stdint.h>
#include <FreeRTOS.h>
#include "semphr.h"

#ifdef	__cplusplus
extern "C" {
#endif

uint8_t initalizeLedDriver(void);

uint8_t readLed(uint8_t ledNum);

uint8_t setLED(uint8_t ledNum, uint8_t value);

uint8_t toggleLED(uint8_t ledNum);

//SemaphoreHandle_t LED0mutex;
//SemaphoreHandle_t LED1mutex;
//SemaphoreHandle_t LED2mutex;
SemaphoreHandle_t LEDmutex[3];

#ifdef	__cplusplus
}
#endif

#endif	/* LEDDRV_H */

