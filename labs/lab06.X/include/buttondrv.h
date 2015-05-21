#ifndef BUTTONDRV_H
#define	BUTTONDRV_H

#include <FreeRTOS.h>
#include "semphr.h"

SemaphoreHandle_t buttonpressmutex;

int LastButtonState;

// Prototypes
void initCN(void);

#endif	/* BUTTONDRV_H */

