#include "myTasks.h"

/*-----------------------------------------------------------*/
/* Variables used by this demo.                              */
/*-----------------------------------------------------------*/
/* Create an xTaskParameters_t structure for each of the two tasks that are
created using the prvToggleAnLED() task function. */
static const xTaskParameter_t xTask0Parameters = {0 /* Toggle LED1 */, (200 / portTICK_RATE_MS) /* At 800ms. */};
static const xTaskParameter_t xTask1Parameters = {1 /* Toggle LED2 */, (200 / portTICK_RATE_MS) /* At 400ms. */};
static const xTaskParameter_t xTask2Parameters = {2 /* Toggle LED3 */, (200 / portTICK_RATE_MS) /* At 150ms. */};

static const int UARTTXTASKPRIORITY = 2;
static const int UARTRXTASKPRIORITY = 3;
//static const int MAINCONTROLTASKPRIORITY = 1;
static const int LEDTASKPRIORITY = 1;
//static const int LED1TASKPRIORITY = 5;
//static const int LED2TASKPRIORITY = 4;
//static const int LED3TASKPRIORITY = 3;




//static const char LED1MESSAGE[] = "LED 1 ISNOW ACTIVE\n\r";
//static const char LED2MESSAGE[] = "LED 2 ISNOW ACTIVE\n\r ";
//static const char LED3MESSAGE[] = "LED 3 ISNOW ACTIVE\n\r ";
//static const char LEDSTARTMESSAGE[] = "LED # STARTING    \n\r";
//static const char LEDBLOCKMESSAGE[] = "LED # BLOCKING    \n\r ";
//static const char LED3MESSAGE[] = "LED 3 ISNOW ACTIVE\n\r ";
//static const char MAINCONTROLSTART[] = "Main Control Start\n\r";
//static const char MAINCONTROLBLOCK[] = "Main Control Block\n\r";

//task handles for the switch control tasks
//TaskHandle_t xControlHandle[3];
//TaskHandle_t xControlHandle;
//task handles for the LED control tasks
TaskHandle_t xLEDHandle[3];
//TaskHandle_t xLEDHandle;
//index for which handle is currently being used.
int currentHandle;

//QueueHandle_t xQueue[3];
//QueueHandle_t xLEDQueue;

TaskHandle_t xButtonTask;



void SystemControlSetup()
{
    if( xButtonTask == NULL )
    {
    //create the corresponding LED task
    xTaskCreate(taskButton,
                        "LED1",
                        configMINIMAL_STACK_SIZE,
                        (void *) &xTask1Parameters,
                        1,
                        &xButtonTask);

                        configASSERT( xButtonTask );
    }



    currentHandle = 0;
    // null out the handle just in case
    if( xLEDHandle[currentHandle] == NULL )
    {
    //create the corresponding LED task
    xTaskCreate(taskToggleAnLED,
                        "LED1",
                        configMINIMAL_STACK_SIZE,
                        (void *) &xTask0Parameters,
                        1,
                        &xLEDHandle[currentHandle]);

                        configASSERT( xLEDHandle[currentHandle] );
    }


    currentHandle++;

    // null out the handle just in case
    if( xLEDHandle[currentHandle] == NULL )
    {
    //create the corresponding LED task
    xTaskCreate(taskToggleAnLED,
                        "LED1",
                        configMINIMAL_STACK_SIZE,
                        (void *) &xTask1Parameters,
                        1,
                        &xLEDHandle[currentHandle]);

                        configASSERT( xLEDHandle[currentHandle] );
    }

    currentHandle++;

    // null out the handle just in case
    if( xLEDHandle[currentHandle] == NULL )
    {
    //create the corresponding LED task
    xTaskCreate(taskToggleAnLED,
                        "LED1",
                        configMINIMAL_STACK_SIZE,
                        (void *) &xTask2Parameters,
                        1,
                        &xLEDHandle[currentHandle]);

                        configASSERT( xLEDHandle[currentHandle] );
    }

    //once everything is set up, reset the currentHandle index
    currentHandle = 0;


}

static void taskButton(void *pvParameters)
{
    xTaskParameter_t *pxTaskParameter;
    //portTickType xStartTime;

    /* The parameter points to an xTaskParameters_t structure. */
    pxTaskParameter = (xTaskParameter_t *) pvParameters;

    xTaskParameter_t a;
    xTaskParameter_t *b;
    b = &a;

    int ThisButtonState = 0;


    while (1)
    {
//a. ?Take? the buttonPress mutex.
        xSemaphoreTake(
                   buttonpressmutex,
                   portMAX_DELAY
               );
//b. vTaskDelay() for 10 ms to serve as a debounce delay.
        vTaskDelay(10);
//c. Read Port D pins. In addition to capturing the pin values, it clears out any Change Differences that currently exist in the module.
        ThisButtonState = mPORTDRead();
//d. Compare the Port D pin values with the global State to determine which buttons were pressed OR released.
//e. When change is detected, a button state change from 0-to-1 (button RELEASE) will ?give? the appropriate ledNAction mutex. Just to be clear, this action is performed ONLY on the release, i.e. not on PRESS. If a 1-to-0 change is detected, no ?give? action is performed.
        int test;
        test = LastButtonState & 0x2000;
        if(LastButtonState == ThisButtonState)
        {
            //nothing was actually pressed/released
        }
        else if(!( LastButtonState & 0x40 ) && (ThisButtonState & 0x40))//changes from 0 to 1, aka release
        {
            //SW 1 release detected
            xSemaphoreGive( LEDmutex[0] );
        }
        else if(!( LastButtonState & 0x80 ) && (ThisButtonState & 0x80))
        {
            //SW 2 release detected
            xSemaphoreGive( LEDmutex[1] );
        }
        else if(!( LastButtonState & 0x2000 ) && (ThisButtonState & 0x2000))
        {
            //SW 3 release detected
            xSemaphoreGive( LEDmutex[2] );
        }
//f. After the ?give? action/s is/are taken, if at all, the Global Button State is updated.
        LastButtonState = ThisButtonState;
        //Return the button press mutex (is this correct?)
        xSemaphoreGive( buttonpressmutex ) ;
//g. Finally, the Change Notification Interrupt is enabled.
        ConfigIntCN(CHANGE_INT_ON);
    }
}


//"driver" function
static void taskToggleAnLED(void *pvParameters)
{
    xTaskParameter_t *pxTaskParameter;
    //portTickType xStartTime;

    /* The parameter points to an xTaskParameters_t structure. */
    pxTaskParameter = (xTaskParameter_t *) pvParameters;

    //xTaskParameter_t a;
    //xTaskParameter_t *b;
    //b = &a;

    while (1)
    {
        xSemaphoreTake(
                   LEDmutex[pxTaskParameter->usLEDNumber],
                   portMAX_DELAY
               );

       toggleLED(pxTaskParameter->usLEDNumber);
    }
}