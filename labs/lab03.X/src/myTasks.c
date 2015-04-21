#include "myTasks.h"

/*-----------------------------------------------------------*/
/* Variables used by this demo.                              */
/*-----------------------------------------------------------*/
/* Create an xTaskParameters_t structure for each of the two tasks that are
created using the prvToggleAnLED() task function. */
static const xTaskParameter_t xTask0Parameters = {0 /* Toggle LED1 */, (800 / portTICK_RATE_MS) /* At 800ms. */};
static const xTaskParameter_t xTask1Parameters = {1 /* Toggle LED2 */, (400 / portTICK_RATE_MS) /* At 400ms. */};
static const xTaskParameter_t xTask2Parameters = {2 /* Toggle LED3 */, (150 / portTICK_RATE_MS) /* At 150ms. */};

/* cals includes */
enum state_enum{
    IDLE = 0,
    DB1,
    PRESSED,
    HOLD,
    DB2
};

enum led_dir{
    INCR = 0,
    DECR
};

//task handles for the switch control tasks
TaskHandle_t xControlHandle[3];
//task handles for the LED control tasks
TaskHandle_t xLEDHandle[3];
//index for which handle is currently being used.
int currentHandle;

/* Code from Lab01, probably not necessary anymore
 *
 *
static void taskmyLeds(void *pvParameters)
{
    xTaskParameter_t *pxTaskParameter;
    portTickType xStartTime;

    uint8_t state;
    uint8_t task_type;

    // The parameter points to an xTaskParameters_t structure.
    pxTaskParameter = (xTaskParameter_t *) pvParameters;

    task_type = pxTaskParameter->usLEDNumber;
    state = 0;

    while (1)
    {
        // Note the time before entering the while loop.  xTaskGetTickCount()
        //is a FreeRTOS API function.
        xStartTime = xTaskGetTickCount();

        // Loop until pxTaskParameters->xToggleRate ticks have 
        while ((xTaskGetTickCount() - xStartTime) < pxTaskParameter->xToggleRate);

        //do the actual LED manipulation
        switch(task_type)
        {
            case 0:
                switch(state)
                {
                    case 0:
                        setLED(0, 1);
                        setLED(1, 0);
                        setLED(2, 0);
                        state = 1;
                        break;
                    case 1:
                        setLED(0, 0);
                        setLED(1, 1);
                        setLED(2, 0);
                        state = 2;
                        break;
                    case 2:
                        setLED(0, 0);
                        setLED(1, 0);
                        setLED(2, 1);
                        state = 0;
                        break;
                    default:
                        setLED(0, 0);
                        setLED(1, 0);
                        setLED(2, 0);
                }
                break;
            case 1:
                switch(state)
                {
                    case 0:
                        setLED(0, 0);
                        setLED(1, 0);
                        setLED(2, 1);
                        state = 1;
                        break;
                    case 1:
                        setLED(0, 0);
                        setLED(1, 1);
                        setLED(2, 0);
                        state = 2;
                        break;
                    case 2:
                        setLED(0, 1);
                        setLED(1, 0);
                        setLED(2, 0);
                        state = 0;
                        break;
                    default:
                        setLED(0, 0);
                        setLED(1, 0);
                        setLED(2, 0);
                }
                break;
            case 2:
                switch(state)
                {
                    case 0:
                        setLED(0, 1);
                        setLED(1, 0);
                        setLED(2, 0);
                        state = 1;
                        break;
                    case 1:
                        setLED(0, 0);
                        setLED(1, 1);
                        setLED(2, 0);
                        state = 2;
                        break;
                    case 2:
                        setLED(0, 0);
                        setLED(1, 0);
                        setLED(2, 1);
                        state = 3;
                        break;
                    case 3:
                        setLED(0, 0);
                        setLED(1, 1);
                        setLED(2, 0);
                        state = 0;
                        break;
                    default:
                        setLED(0, 0);
                        setLED(1, 0);
                        setLED(2, 0);
                }
                break;
            default:
                toggleLED(7);
        }
    }
}
*/

static void taskSystemControl(void *pvParameters)
{
    xTaskParameter_t *pxTaskParameter;
    portTickType xStartTime;

    /* The parameter points to an xTaskParameters_t structure. */
    pxTaskParameter = (xTaskParameter_t *) pvParameters;

    //TaskHandle_t xControlHandle[3];

    xTaskParameter_t xTask3Parameters[3];// = {0 /* Toggle LED1 */, (800 / portTICK_RATE_MS) /* At 800ms. */};
    xTask3Parameters[0] = xTask0Parameters;
    xTask3Parameters[1] = xTask1Parameters;
    xTask3Parameters[2] = xTask2Parameters;

    uint8_t SW1 = 1;
    uint8_t lastSW1 = 0;
    uint8_t SW2 = 1;
    uint8_t lastSW2 = 0;
    uint8_t SW3 = 1;
    uint8_t lastSW3 = 0;

    uint8_t paused = 0;
    uint8_t state[3];
    state[0] = 0;
    state[1] = 0;
    state[2] = 0;

    int index = 0;
    int i = 0;
    int j = 0;
    //int k = 0;
    int a = 0;

    if(currentHandle < 3)
    {
        // null out the handle just in case
        xControlHandle[currentHandle] = NULL;
        //create the corresponding LED task
        xTaskCreate(taskToggleAnLED,
                            "LED1",
                            configMINIMAL_STACK_SIZE,
                            (void *) &xTask3Parameters[currentHandle],
                            1,
                            &xLEDHandle[currentHandle]);

                            configASSERT( xLEDHandle[currentHandle] );

        //once everything is set up, increment the currentHandle index
        currentHandle++;
    }
    
    //xControlHandle[1] = NULL;
    //xControlHandle[2] = NULL;


    while (1)
    {
        i = mPORTDReadBits(BIT_6 | BIT_7 | BIT_13);
        switch(state[0])
        {
            case IDLE:
                if(i & BIT_6)
                {
                    state[0] = IDLE; // no change
                }
                else
                {
                    vTaskDelay(10);
                    i = mPORTDReadBits(BIT_6 | BIT_7 | BIT_13);
                    if(i & BIT_6)
                    {
                        state[0] = IDLE;
                    }
                    else
                    {
                        state[0] = PRESSED;
                    }
                    //    state[0] = DB1;
                }

                break;
            case PRESSED:
                if(!paused)
                {
                    //start a task
                    if(index < 3) // max of 3 tasks
                    {
                           xTaskCreate(taskToggleAnLED,
                            "LED1",
                            configMINIMAL_STACK_SIZE,
                            (void *) &xTask3Parameters[index],
                            1,
                            &xControlHandle[index]);
                            configASSERT( xControlHandle[index] );
                        index++;
                    }
                }
                state[0] = HOLD;
                break;
            case HOLD:
                if(i & BIT_6)
                {
                    //state[0] = DB2;
                    vTaskDelay(10);
                    i = mPORTDReadBits(BIT_6 | BIT_7 | BIT_13);
                    if(i & BIT_6)
                    {
                        state[0] = IDLE;
                    }
                    else
                    {
                        state[0] = HOLD;
                    }
                }
                else
                {
                    state[0] = HOLD; // no change
                }

                break;
            default:
                state[0] = IDLE;
        }

        switch(state[1])
        {
            case IDLE:
                if(i & BIT_7)
                {
                    state[1] = IDLE; // no change
                }
                else
                {
                    vTaskDelay(10);
                    i = mPORTDReadBits(BIT_6 | BIT_7 | BIT_13);
                    if(i & BIT_7)
                    {
                        state[1] = IDLE;
                    }
                    else
                    {
                        state[1] = PRESSED;
                    }
                }
                break;
            case PRESSED:
                if(!paused)
                {
                    //end a task
                    if(index > 0) // minimum tasks of 0
                    {
                        if( xControlHandle[index - 1] != NULL )
                        {
                            vTaskDelete( xControlHandle[index - 1] );
                        }
                        index--;
                    }
                }
                state[1] = HOLD;
                break;
            case HOLD:
                if(i & BIT_7)
                {
                    //state[0] = DB2;
                    vTaskDelay(10);
                    i = mPORTDReadBits(BIT_6 | BIT_7 | BIT_13);
                    if(i & BIT_7)
                    {
                        state[1] = IDLE;
                    }
                    else
                    {
                        state[1] = HOLD;
                    }
                }
                else
                {
                    state[1] = HOLD; // no change
                }

                break;
            default:
                state[1] = IDLE;
        }

        switch(state[2])
        {
            case IDLE:
                if(i & BIT_13)
                {
                    state[2] = IDLE; // no change
                }
                else
                {
                    vTaskDelay(10);
                    i = mPORTDReadBits(BIT_6 | BIT_7 | BIT_13);
                    if(i & BIT_13)
                    {
                        state[2] = IDLE;
                    }
                    else
                    {
                        state[2] = PRESSED;
                    }
                }
                break;
            case PRESSED:
                //end a task
                //if(index > 0) // minimum tasks of 0
                //{
                    if(paused == 0)
                    {
                        //suspend all tasks
                        paused = 1;
                        for(j = 0; j < index; j++)
                        {
                            vTaskSuspend(xControlHandle[j]);
                        }

                    }
                    else
                    {
                        //resume all tasks
                        paused = 0;

                        for(j = 0; j < index; j++)
                        {
                            vTaskResume(xControlHandle[j]);
                        }
                    }

                //}
                state[2] = HOLD;
                break;
            case HOLD:
                if(i & BIT_13)
                {
                    //state[0] = DB2;
                    vTaskDelay(10);
                    i = mPORTDReadBits(BIT_6 | BIT_7 | BIT_13);
                    if(i & BIT_13)
                    {
                        state[2] = IDLE;
                    }
                    else
                    {
                        state[2] = HOLD;
                    }
                }
                else
                {
                    state[2] = HOLD; // no change
                }

                break;
            default:
                state[2] = IDLE;
        }

        vTaskDelay(100);
    }
}

//"driver" function
static void taskToggleAnLED(void *pvParameters)
{
    xTaskParameter_t *pxTaskParameter;
    //portTickType xStartTime;

    /* The parameter points to an xTaskParameters_t structure. */
    pxTaskParameter = (xTaskParameter_t *) pvParameters;

    while (1)
    {
        /* Note the time before entering the while loop.  xTaskGetTickCount()
        is a FreeRTOS API function. */
        //xStartTime = xTaskGetTickCount();

        /* Loop until pxTaskParameters->xToggleRate ticks have */
        //while ((xTaskGetTickCount() - xStartTime) < pxTaskParameter->xToggleRate);

        //try to delay the task for 500 ms
        vTaskDelay(500);

        toggleLED(pxTaskParameter->usLEDNumber);

    }
}