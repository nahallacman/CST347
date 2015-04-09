#include "myTasks.h"

static void taskmyLeds(void *pvParameters)
{
    xTaskParameter_t *pxTaskParameter;
    portTickType xStartTime;

    /* The parameter points to an xTaskParameters_t structure. */
    pxTaskParameter = (xTaskParameter_t *) pvParameters;

    while (1)
    {
        /* Note the time before entering the while loop.  xTaskGetTickCount()
        is a FreeRTOS API function. */
        xStartTime = xTaskGetTickCount();

        /* Loop until pxTaskParameters->xToggleRate ticks have */
        while ((xTaskGetTickCount() - xStartTime) < pxTaskParameter->xToggleRate);

        //do the actual LED manipulation
    }
}


