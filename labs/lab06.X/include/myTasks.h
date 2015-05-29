
/*
 * File:   leddrv.h
 * Author: mainuser
 *
 * Created on April 2, 2015, 7:48 PM
 */

#ifndef MYTASKS_H
#define	MYTASKS_H

#ifdef	__cplusplus
extern "C" {
#endif


#include "leddrv.h"

#include <FreeRTOS.h>
#include "task.h"
#include "queue.h"
#include "semphr.h"

#include <plib.h>

#include "uartdrv.h"

#include "buttondrv.h"

/*-----------------------------------------------------------*/
/* Structures used by this demo.                             */
/*-----------------------------------------------------------*/
/* The structure that is passed into tasks that use the prvToggleAnLED() task function.
 The structure lets the task know which LED to toggle, and at which rate. */
typedef struct xTASK_PARAMETER {
    uint16_t usLEDNumber;                   /* The number of the LED to toggle. */
    portTickType xToggleRate;               /* The rate at which the LED should be toggle. */
} xTaskParameter_t;

 struct /* __attribute__ ((packed)) */LEDMessage
 {
    uint8_t ucMessageID;
    uint32_t LEDDelay;
    //char ucData[ 20 ];
 } xLEDMessage;

 struct /*__attribute__ ((packed)) */UARTMessage
 {
     uint8_t ucMessageID;
     char ucMessage[50];
 } xUARTMessage;

/* A task that toggles an LED at a fixed frequency.  This time, the LED to
toggle and the rate at which the LED is toggled are passed into the task
using the task parameter.  This allows the same task function to be used to
create multiple tasks that each behave slightly differently. */
static void taskToggleAnLED(void *pvParameters);

static void taskButton(void *pvParameters);

//sets up the system control tasks
//and queues
static void SystemControlSetup();

//task for UART transmit control
static void taskUARTTXControl(void *pvParameters);

//task for UART recieve control
static void taskUARTRXControl(void *pvParameters);

//static void vCommandConsoleTask( void *pvParameters );


TaskHandle_t xLEDHandle[3];
//TaskHandle_t xLEDHandle;
//index for which handle is currently being used.
int currentHandle;

//QueueHandle_t xQueue[3];
QueueHandle_t xLEDQueue[3];

TaskHandle_t xButtonTask;

//TaskHandle_t xCLITask;


static const xTaskParameter_t xTask0Parameters = {0 /* Toggle LED1 */, (200 / portTICK_RATE_MS) /* At 800ms. */};
static const xTaskParameter_t xTask1Parameters = {1 /* Toggle LED2 */, (200 / portTICK_RATE_MS) /* At 400ms. */};
static const xTaskParameter_t xTask2Parameters = {2 /* Toggle LED3 */, (200 / portTICK_RATE_MS) /* At 150ms. */};

static const int UARTTXTASKPRIORITY = 2;
static const int UARTRXTASKPRIORITY = 3;
static const int LEDTASKPRIORITY = 1;

static const char STATICNULL = '\0';
#ifdef	__cplusplus
}
#endif

#endif	/* MYTASKS_H */
